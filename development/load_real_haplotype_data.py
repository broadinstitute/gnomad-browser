#!/usr/bin/env python3
"""Load real HPRC haplotype data, methylation, coverage, and gene models into local Elasticsearch/ClickHouse.

Usage:
    python3 development/load_real_haplotype_data.py haplotypes --region chr22:20M-21M --backend clickhouse
    python3 development/load_real_haplotype_data.py coverage --region chr22:20M-21M --backend clickhouse
    python3 development/load_real_haplotype_data.py methylation --region chr22:20M-21M --backend clickhouse
    python3 development/load_real_haplotype_data.py genes --region chr22:20M-21M
    python3 development/load_real_haplotype_data.py metadata --backend clickhouse
    python3 development/load_real_haplotype_data.py histograms --backend clickhouse
    python3 development/load_real_haplotype_data.py variants --region chr22:20M-21M --backend clickhouse
    python3 development/load_real_haplotype_data.py all --region chr22:20M-21M --backend clickhouse
"""
import argparse
import collections
import gzip
import hashlib
import itertools
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

# GCS paths — old prototype data (JSON mode)
GCS_SAMPLES_AFEWGENES = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-19/afewgenes/samples-fff0695d-484f-417d-861b-f0500a0f9aa0.json"
GCS_SAMPLES_FULL = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-20/chr1_hpcr/samples-e6103797-2e6c-46a3-b12d-c82c4b2a6c8c.json"
GCS_METHYLATION_DIR = "gs://fc-fd42e80c-b41e-4e60-a9cf-b7c0ade168c4/HPRC_assembly/methylation/"

# GCS paths — new v1/v2 datasets
GCS_VCF_V1 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v1/hprc_chr22.reformatted.vcf.gz"
GCS_VCF_V2 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc_chr22.in_silico_predictors.vcf.gz"
GCS_AF_HISTOGRAMS_V2 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc.af_histograms.tsv"
GCS_COVERAGE_V2 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc.coverage.tsv.gz"

# HPRC sample metadata
HPRC_METADATA_URL = "https://raw.githubusercontent.com/human-pangenomics/hprc_intermediate_assembly/main/data_tables/sample/hprc_release2_sample_metadata.csv"

# 1000 Genomes subpopulation -> superpopulation mapping
SUBPOP_TO_SUPERPOP = {
    "ACB": "AFR", "ASW": "AFR", "ESN": "AFR", "GWD": "AFR", "LWK": "AFR",
    "MSL": "AFR", "YRI": "AFR", "MKK": "AFR", "ASL": "AFR",
    "CLM": "AMR", "MXL": "AMR", "PEL": "AMR", "PUR": "AMR",
    "CDX": "EAS", "CHB": "EAS", "CHS": "EAS", "JPT": "EAS", "KHV": "EAS",
    "GBR": "EUR", "FIN": "EUR", "IBS": "EUR", "TSI": "EUR",
    "BEB": "SAS", "GIH": "SAS", "ITU": "SAS", "PJL": "SAS", "STU": "SAS",
}

# ES indices
HAPLO_INDEX = "gnomad_r4_lr_haplotypes"
METHY_INDEX = "gnomad_r4_lr_methylation_summary"
COVERAGE_INDEX = "gnomad_r4_lr_coverage"
GENES_INDEX = "genes_grch38"

# gnomAD public API
GNOMAD_API = "https://gnomad.broadinstitute.org/api/"

BATCH_SIZE = 5000


def es_request(es_url, path, data=None, method=None):
    """Make an HTTP request to ES."""
    url = f"{es_url}{path}"
    headers = {}
    if data is not None:
        if isinstance(data, str):
            data = data.encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"ES error {e.code}: {body[:500]}")
        raise


def clickhouse_insert(ch_url, table, bulk_lines):
    """Send JSONEachRow bulk request to ClickHouse."""
    body = "\n".join(bulk_lines) + "\n"

    url = f"{ch_url}/?query=INSERT%20INTO%20{table}%20FORMAT%20JSONEachRow"
    req = urllib.request.Request(
        url,
        data=body.encode(),
        headers={"Content-Type": "application/x-ndjson"},
    )
    try:
        resp = urllib.request.urlopen(req)
        return resp.read().decode()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  ClickHouse HTTP error {e.code}: {err_body[:1000]}")
        raise


def es_bulk(es_url, bulk_lines):
    """Send bulk request to ES."""
    body = "\n".join(bulk_lines) + "\n"
    req = urllib.request.Request(
        f"{es_url}/_bulk",
        data=body.encode(),
        headers={"Content-Type": "application/x-ndjson"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"  Bulk HTTP error {e.code}: {err_body[:1000]}")
        raise
    if resp.get("errors"):
        # Find first error
        for item in resp["items"]:
            action = list(item.values())[0]
            if action.get("error"):
                print(f"  Bulk error: {action['error']}")
                break
    return resp


def delete_and_create_index(es_url, index_name):
    """Delete index if exists, then create it."""
    # Delete
    try:
        req = urllib.request.Request(f"{es_url}/{index_name}", method="DELETE")
        urllib.request.urlopen(req)
        print(f"  Deleted existing index {index_name}")
    except urllib.error.HTTPError:
        pass  # Index didn't exist


def gcs_download(gcs_path, local_path):
    """Download a file from GCS using gsutil."""
    print(f"  Downloading {gcs_path}...")
    result = subprocess.run(
        ["gsutil", "-q", "cp", gcs_path, local_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  gsutil error: {result.stderr}")
        sys.exit(1)


def gcs_list(gcs_dir):
    """List files in a GCS directory."""
    result = subprocess.run(
        ["gsutil", "ls", gcs_dir],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  gsutil ls error: {result.stderr}")
        return []
    return [line.strip() for line in result.stdout.strip().split("\n") if line.strip()]


def gcs_stream_gzip(gcs_path):
    """Stream a gzipped file from GCS, yielding decoded lines."""
    proc = subprocess.Popen(
        ["gsutil", "cat", gcs_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    with gzip.open(proc.stdout, "rt") as f:
        for line in f:
            yield line
    proc.wait()
    if proc.returncode != 0:
        stderr = proc.stderr.read().decode()
        print(f"  gsutil cat error: {stderr[:500]}")


def gcs_stream_plain(gcs_path):
    """Stream a plain (uncompressed) file from GCS, yielding decoded lines."""
    proc = subprocess.Popen(
        ["gsutil", "cat", gcs_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    for raw_line in proc.stdout:
        yield raw_line.decode("utf-8")
    proc.wait()
    if proc.returncode != 0:
        stderr = proc.stderr.read().decode()
        print(f"  gsutil cat error: {stderr[:500]}")


# --- Variant loading constants ---

POPULATIONS = ["afr", "amr", "asj", "eas", "nfe", "sas"]
DIVISIONS = list(itertools.chain.from_iterable([pop, f"{pop}_XX", f"{pop}_XY"] for pop in POPULATIONS)) + ["XX", "XY"]

FREQ_FIELDS = ["AN", "AC", "AF", "nhomref", "nhet", "nhomalt", "freq_homref", "freq_het", "freq_homalt"]

FREQ_FIELD_RENAMES = {
    "nhomref": "homozygote_ref_count",
    "nhomalt": "homozygote_alt_count",
    "nhet": "heterozygote_count",
    "freq_homref": "homozygote_ref_freq",
    "freq_homalt": "homozygote_alt_freq",
    "freq_het": "heterozygote_freq",
}

OMIT_CONSEQUENCE_TERMS = {"upstream_gene_variant", "downstream_gene_variant"}

# Consequence terms ranked by severity (lower index = more severe)
CONSEQUENCE_TERMS = [
    "transcript_ablation", "splice_acceptor_variant", "splice_donor_variant",
    "stop_gained", "frameshift_variant", "stop_lost", "start_lost",
    "initiator_codon_variant", "transcript_amplification", "inframe_insertion",
    "inframe_deletion", "missense_variant", "protein_altering_variant",
    "splice_region_variant", "incomplete_terminal_codon_variant",
    "start_retained_variant", "stop_retained_variant", "synonymous_variant",
    "coding_sequence_variant", "mature_miRNA_variant", "5_prime_UTR_variant",
    "3_prime_UTR_variant", "non_coding_transcript_exon_variant",
    "non_coding_exon_variant", "intron_variant", "NMD_transcript_variant",
    "non_coding_transcript_variant", "nc_transcript_variant",
    "upstream_gene_variant", "downstream_gene_variant", "TFBS_ablation",
    "TFBS_amplification", "TF_binding_site_variant",
    "regulatory_region_ablation", "regulatory_region_amplification",
    "feature_elongation", "regulatory_region_variant", "feature_truncation",
    "intergenic_variant",
]
CONSEQUENCE_TERM_RANK = {term: rank for rank, term in enumerate(CONSEQUENCE_TERMS)}


# --- Variant loading (site-level) ---


def build_enveloped_map(vcf_path, region_chrom, region_start, region_stop):
    """Pre-pass: build a map of TR variant_id -> [enveloped variant_ids].

    Scans VCF lines with TR_ENVELOPED flag to find variants enveloped by a TR.
    Returns dict mapping enveloping TR's variant_id -> list of enveloped variant_ids.
    """
    enveloped_map = collections.defaultdict(list)
    print("  Pre-pass: building enveloped_ids map...")

    for line in gcs_stream_gzip(vcf_path):
        line = line.rstrip("\n")
        if line.startswith("#"):
            continue
        if "TR_ENVELOPED" not in line:
            continue

        parts = line.split("\t")
        if len(parts) < 8:
            continue

        chrom_field = parts[0]
        pos = int(parts[1])

        if chrom_field != region_chrom:
            continue
        if pos < region_start or pos > region_stop:
            continue

        info_str = parts[7]
        info = parse_info_field(info_str)

        # Only process lines that actually have the TR_ENVELOPED flag
        if "TR_ENVELOPED" not in info:
            continue

        # variant_id from VCF ID column, strip "chr"
        variant_id = parts[2].replace("chr", "", 1)

        # TRID is the ID of the enveloping TR
        trid = info.get("TRID", "")
        if trid is True or not trid:
            continue
        trid = trid.replace("chr", "", 1)

        enveloped_map[trid].append(variant_id)

    print(f"  Pre-pass complete: {sum(len(v) for v in enveloped_map.values())} enveloped variants across {len(enveloped_map)} TRs")
    return dict(enveloped_map)


def parse_info_first(info, key, default=""):
    """Extract the first value from a Number=. INFO field (comma-separated), or default."""
    val = info.get(key)
    if val is None or val is True or val == ".":
        return default
    return val.split(",")[0]


def compute_xpos(chrom):
    """Compute chromosome number for xpos calculation."""
    c = chrom.replace("chr", "")
    if c == "X":
        return 23
    elif c == "Y":
        return 24
    elif c == "M" or c == "MT":
        return 25
    try:
        return int(c)
    except ValueError:
        return 0


def parse_vep_entries(info):
    """Parse VEP from INFO field. Returns (transcript_consequences, genes, intergenic, major_consequence)."""
    vep_str = info.get("vep")
    if not vep_str or vep_str is True:
        return [], [], 0, ""

    entries = vep_str.split(",")

    # Collect genes from ALL entries (not just transcript VEP)
    genes_set = set()
    intergenic = 0
    transcript_consequences = []

    for entry_str in entries:
        fields = entry_str.split("|")

        # Genes: collect from all entries with symbol and ensembl_id
        if len(fields) > 4:
            symbol = fields[3]
            ensembl_id = fields[4]
            if symbol and ensembl_id:
                genes_set.add((symbol, ensembl_id))

        # Intergenic: feature_type is empty
        if len(fields) > 5 and fields[5] == "":
            intergenic = 1

        # Only PICK=1 entries (index 22) for transcript consequences
        if len(fields) <= 22 or fields[22] != "1":
            continue
        # Only Transcript feature_type (index 5)
        if len(fields) <= 5 or fields[5] != "Transcript":
            continue

        consequence_terms = [t for t in fields[1].split("&") if t and t not in OMIT_CONSEQUENCE_TERMS]
        if not consequence_terms:
            continue

        # HGVSc at index 10, HGVSp at index 11 (correcting Hail bug using 9/10)
        hgvsc = fields[10].split(":")[-1] if len(fields) > 10 and fields[10] else ""
        hgvsp = fields[11].split(":")[-1] if len(fields) > 11 and fields[11] else ""

        tc = {
            "consequence_terms": consequence_terms,
            "gene_symbol": fields[3] if len(fields) > 3 else "",
            "gene_id": fields[4] if len(fields) > 4 else "",
            "transcript_id": fields[6] if len(fields) > 6 else "",
            "is_canonical": (fields[27] == "YES") if len(fields) > 27 else False,
            "major_consequence": min(consequence_terms, key=lambda t: CONSEQUENCE_TERM_RANK.get(t, 999)),
        }
        if hgvsc:
            tc["hgvsc"] = hgvsc
        if hgvsp:
            tc["hgvsp"] = hgvsp
        if len(fields) > 45 and fields[45]:
            tc["sift_prediction"] = fields[45]
        if len(fields) > 46 and fields[46]:
            tc["polyphen_prediction"] = fields[46]
        if len(fields) > 47 and fields[47]:
            tc["domains"] = [fields[47]]

        transcript_consequences.append(tc)

    # Compute top-level major_consequence from all transcript consequences
    major_consequence = ""
    if transcript_consequences:
        all_terms = []
        for tc in transcript_consequences:
            all_terms.extend(tc["consequence_terms"])
        if all_terms:
            major_consequence = min(all_terms, key=lambda t: CONSEQUENCE_TERM_RANK.get(t, 999))

    genes = [{"symbol": s, "ensembl_id": e} for s, e in sorted(genes_set)]

    return transcript_consequences, genes, intergenic, major_consequence


def build_freq_json(info):
    """Build the nested frequency JSON matching LongReadVariantFrequencies."""
    def get_freq_fields(info, suffix=""):
        ac_val = info.get(f"AC{suffix}")
        af_val = info.get(f"AF{suffix}")
        # AC and AF are Number=A (array), take first element
        if ac_val and ac_val is not True and ac_val != ".":
            ac_val = ac_val.split(",")[0]
        if af_val and af_val is not True and af_val != ".":
            af_val = af_val.split(",")[0]
        return {
            "ac": parse_info_int(info, f"AC{suffix}", 0) if not suffix else _safe_int(ac_val, 0),
            "an": _safe_int(info.get(f"AN{suffix}"), 0),
            "af": _safe_float(af_val if suffix else info.get("AF"), 0.0),
            "homozygote_ref_count": _safe_int(info.get(f"nhomref{suffix}"), 0),
            "homozygote_alt_count": _safe_int(info.get(f"nhomalt{suffix}"), 0),
            "heterozygote_count": _safe_int(info.get(f"nhet{suffix}"), 0),
            "homozygote_ref_freq": _safe_float(info.get(f"freq_homref{suffix}"), 0.0),
            "homozygote_alt_freq": _safe_float(info.get(f"freq_homalt{suffix}"), 0.0),
            "heterozygote_freq": _safe_float(info.get(f"freq_het{suffix}"), 0.0),
        }

    # Global "all" frequencies
    all_freq = get_freq_fields(info)
    # Handle AC/AF as Number=A (array type) for global
    ac_raw = info.get("AC")
    if ac_raw and ac_raw is not True and ac_raw != ".":
        all_freq["ac"] = _safe_int(ac_raw.split(",")[0], 0)
    af_raw = info.get("AF")
    if af_raw and af_raw is not True and af_raw != ".":
        all_freq["af"] = _safe_float(af_raw.split(",")[0], 0.0)

    # Per-division populations
    populations = []
    for division in DIVISIONS:
        suffix = f"_{division}"
        pop_freq = {"id": division}
        ac_raw = info.get(f"AC{suffix}")
        if ac_raw and ac_raw is not True and ac_raw != ".":
            pop_freq["ac"] = _safe_int(ac_raw.split(",")[0], 0)
        else:
            pop_freq["ac"] = 0
        af_raw = info.get(f"AF{suffix}")
        if af_raw and af_raw is not True and af_raw != ".":
            pop_freq["af"] = _safe_float(af_raw.split(",")[0], 0.0)
        else:
            pop_freq["af"] = 0.0
        pop_freq["an"] = _safe_int(info.get(f"AN{suffix}"), 0)
        pop_freq["homozygote_ref_count"] = _safe_int(info.get(f"nhomref{suffix}"), 0)
        pop_freq["homozygote_alt_count"] = _safe_int(info.get(f"nhomalt{suffix}"), 0)
        pop_freq["heterozygote_count"] = _safe_int(info.get(f"nhet{suffix}"), 0)
        pop_freq["homozygote_ref_freq"] = _safe_float(info.get(f"freq_homref{suffix}"), 0.0)
        pop_freq["homozygote_alt_freq"] = _safe_float(info.get(f"freq_homalt{suffix}"), 0.0)
        pop_freq["heterozygote_freq"] = _safe_float(info.get(f"freq_het{suffix}"), 0.0)
        populations.append(pop_freq)

    return json.dumps({"all": all_freq, "populations": populations})


def _safe_int(val, default=0):
    if val is None or val is True or val == ".":
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=0.0):
    if val is None or val is True or val == ".":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def load_variants_vcf(ch_url, region_chrom, region_start, region_stop, vcf_path=None):
    """Stream a VCF from GCS and load site-level variant docs into ClickHouse lr_variants."""
    if vcf_path is None:
        vcf_path = GCS_VCF_V2

    print(f"\n=== Loading variants from VCF (site-level) ===")
    print(f"  VCF: {vcf_path}")
    print(f"  Region: {region_chrom}:{region_start}-{region_stop}")

    # Pre-pass to build enveloped map
    enveloped_map = build_enveloped_map(vcf_path, region_chrom, region_start, region_stop)

    # Main pass
    bulk_lines = []
    count = 0
    chrom_num = compute_xpos(region_chrom)

    for line in gcs_stream_gzip(vcf_path):
        line = line.rstrip("\n")
        if line.startswith("#"):
            continue

        parts = line.split("\t")
        if len(parts) < 8:
            continue

        chrom_field = parts[0]
        pos = int(parts[1])

        if chrom_field != region_chrom:
            continue
        if pos < region_start or pos > region_stop:
            continue

        ref = parts[3]
        alt = parts[4].split(",")[0]  # Take first alt for biallelic sites
        filter_field = parts[6]
        info_str = parts[7]

        # variant_id from VCF ID column, strip "chr"
        variant_id = parts[2].replace("chr", "", 1)

        # Parse INFO
        info = parse_info_field(info_str)

        allele_type = info.get("allele_type", "")
        if allele_type is True:
            allele_type = ""

        filters = [] if filter_field == "." or filter_field == "PASS" else filter_field.split(";")

        # xpos
        xpos = chrom_num * 1_000_000_000 + pos

        # VEP parsing
        transcript_consequences, genes, intergenic, major_consequence = parse_vep_entries(info)

        # Frequencies
        freq_json = build_freq_json(info)

        # Short read matches (Number=. type, take first)
        short_read_match_id = parse_info_first(info, "gnomAD_V4_match_ID")
        short_read_match_type = parse_info_first(info, "gnomAD_V4_match_type")
        short_read_match_source = parse_info_first(info, "gnomAD_V4_match_source")

        # TR fields
        is_likely_tr = 1 if "TR_PARSED" in info else 0

        enveloping_tr_id = ""
        if "TR_ENVELOPED" in info:
            trid = info.get("TRID", "")
            if trid and trid is not True:
                enveloping_tr_id = trid.replace("chr", "", 1)

        enveloped_ids = enveloped_map.get(variant_id, []) if allele_type == "trv" else []

        motifs_raw = info.get("MOTIFS")
        motifs = motifs_raw.split(",") if motifs_raw and motifs_raw is not True else []

        gene_region = info.get("REGION", "")
        if gene_region is True:
            gene_region = ""

        gnomad_str = info.get("gnomAD_STR", "")
        if gnomad_str is True:
            gnomad_str = ""

        # main_reference_region: only for trv
        main_reference_region_json = ""
        if allele_type == "trv":
            chrom_stripped = chrom_field.replace("chr", "")
            main_reference_region_json = json.dumps({
                "reference_genome": "GRCh38",
                "chrom": chrom_stripped,
                "start": pos,
                "stop": pos + len(ref),
            })

        doc = {
            "chrom": chrom_field,
            "position": pos,
            "ref": ref,
            "alt": alt,
            "variant_id": variant_id,
            "xpos": xpos,
            "rsids": [parts[2]] if parts[2] != "." else [],
            "allele_type": allele_type,
            "filters": filters,
            "intergenic": intergenic,
            "gene_region": gene_region,
            "major_consequence": major_consequence,
            "end": parse_info_int(info, "END"),
            "length": parse_info_int(info, "SVLEN"),
            "cadd_phred": parse_info_float(info, "CADD_PHRED_score"),
            "phylop": parse_info_float(info, "phylop"),
            "short_read_match_id": short_read_match_id,
            "short_read_match_type": short_read_match_type,
            "short_read_match_source": short_read_match_source,
            "enveloping_tr_id": enveloping_tr_id,
            "enveloped_ids": enveloped_ids,
            "motifs": motifs,
            "is_likely_tr": is_likely_tr,
            "gnomad_str": gnomad_str,
            "freq_json": freq_json,
            "transcript_consequences_json": json.dumps(transcript_consequences),
            "genes_json": json.dumps(genes),
            "main_reference_region_json": main_reference_region_json,
        }

        bulk_lines.append(json.dumps(doc))
        count += 1

        if len(bulk_lines) >= BATCH_SIZE:
            clickhouse_insert(ch_url, "lr_variants", bulk_lines)
            print(f"  Inserted {count} variant docs so far...")
            bulk_lines = []

    if bulk_lines:
        clickhouse_insert(ch_url, "lr_variants", bulk_lines)

    print(f"  Total: {count} variant docs inserted")
    return count


# --- Haplotype loading (VCF mode) ---


def parse_info_field(info_str):
    """Parse a VCF INFO field into a dictionary."""
    info = {}
    for entry in info_str.split(";"):
        if "=" in entry:
            key, val = entry.split("=", 1)
            info[key] = val
        else:
            info[entry] = True
    return info


def parse_info_float(info, key, default=None):
    """Extract a float value from parsed INFO dict."""
    val = info.get(key)
    if val is None or val == ".":
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def parse_info_int(info, key, default=None):
    """Extract an int value from parsed INFO dict."""
    val = info.get(key)
    if val is None or val == ".":
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def get_hap_value(fmt, key, hap_idx, default=None):
    """Extract a per-haplotype value from a comma-separated FORMAT field.

    FORMAT fields like AM, AP, MC contain one value per GT allele (comma-separated).
    hap_idx is 0 for strand 1, 1 for strand 2.
    """
    val = fmt.get(key)
    if val is None or val == ".":
        return default
    parts = val.split(",")
    if hap_idx < len(parts):
        v = parts[hap_idx]
        if v == "." or v == "":
            return default
        try:
            return float(v)
        except (ValueError, TypeError):
            return default
    return default


def load_haplotypes_vcf(es_url, region_chrom, region_start, region_stop, backend="es", ch_url=None, vcf_path=None):
    """Stream a VCF from GCS and load per-carrier docs into ES or ClickHouse."""
    if vcf_path is None:
        vcf_path = GCS_VCF_V2
    print(f"\n=== Loading haplotypes from VCF (streaming from GCS) ===")
    print(f"  VCF: {vcf_path}")
    print(f"  Region: {region_chrom}:{region_start}-{region_stop}")

    if backend == "es":
        delete_and_create_index(es_url, HAPLO_INDEX)

    sample_names = []
    bulk_lines = []
    count = 0
    variants_seen = 0

    for line in gcs_stream_gzip(vcf_path):
        line = line.rstrip("\n")

        # Header lines
        if line.startswith("##"):
            continue
        if line.startswith("#CHROM"):
            parts = line.split("\t")
            sample_names = parts[9:]  # samples start at column 9
            print(f"  Found {len(sample_names)} samples in VCF header")
            continue

        # Variant line
        parts = line.split("\t")
        if len(parts) < 10:
            continue

        chrom_field = parts[0]
        pos = int(parts[1])

        # Filter by region
        if chrom_field != region_chrom:
            continue
        if pos < region_start or pos > region_stop:
            continue

        variants_seen += 1
        ref = parts[3]
        alt_field = parts[4]
        alt_list = alt_field.split(",")
        qual_str = parts[5]
        filter_field = parts[6]
        info_str = parts[7]
        format_field = parts[8]

        qual = float(qual_str) if qual_str != "." else 0
        filters = [] if filter_field == "." or filter_field == "PASS" else filter_field.split(";")

        # Parse INFO
        info = parse_info_field(info_str)
        af = parse_info_float(info, "AF")
        ac = parse_info_int(info, "AC")
        an = parse_info_int(info, "AN")
        allele_type = info.get("allele_type", "")
        if allele_type is True:
            allele_type = ""
        allele_length = parse_info_int(info, "allele_length")
        gnomad_v4_match_type = info.get("gnomAD_V4_match_type", "")
        if gnomad_v4_match_type is True:
            gnomad_v4_match_type = ""

        # Population AFs
        af_afr = parse_info_float(info, "AF_afr")
        af_amr = parse_info_float(info, "AF_amr")
        af_eas = parse_info_float(info, "AF_eas")
        af_nfe = parse_info_float(info, "AF_nfe")
        af_sas = parse_info_float(info, "AF_sas")

        # v2 INFO fields
        cadd_phred = parse_info_float(info, "CADD_PHRED_score")
        phylop = parse_info_float(info, "phylop")
        dbgap_id = info.get("dbGaP_ID", "")
        if dbgap_id is True:
            dbgap_id = ""
        tr_id = info.get("TRID", "")
        if tr_id is True:
            tr_id = ""
        tr_motifs = info.get("MOTIFS", "")
        if tr_motifs is True:
            tr_motifs = ""
        tr_struc = info.get("STRUC", "")
        if tr_struc is True:
            tr_struc = ""

        # SV consequence predictions: collect all PREDICTED_* keys
        sv_consequences = []
        for info_key, info_val in info.items():
            if info_key.startswith("PREDICTED_"):
                consequence_type = info_key[len("PREDICTED_"):]
                gene_name = info_val if isinstance(info_val, str) else ""
                sv_consequences.append(f"{consequence_type}:{gene_name}" if gene_name else consequence_type)

        # Parse FORMAT fields
        format_keys = format_field.split(":")

        rsid = parts[2] if parts[2] != "." else ""

        # Process each sample
        for i, sample_data in enumerate(parts[9:]):
            if sample_data == "." or sample_data.startswith("./."):
                continue

            fmt_values = sample_data.split(":")
            fmt = dict(zip(format_keys, fmt_values))

            gt = fmt.get("GT", "./.")
            if gt in ("./.", "0|0", "0/0"):
                continue

            # Check RNC (reason not called)
            rnc = fmt.get("RNC", "..")
            if rnc != ".." and rnc != "..":
                # RNC has two characters, one per allele. "." means called OK.
                # Skip if both alleles have a reason-not-called
                if rnc[0] != "." and rnc[1] != ".":
                    continue

            # Determine separator and phase
            if "|" in gt:
                gt_parts = gt.split("|")
                gt_phased = True
            else:
                gt_parts = gt.split("/")
                gt_phased = False

            gt_alleles = []
            try:
                gt_alleles = [int(a) for a in gt_parts if a != "."]
            except ValueError:
                continue

            # Determine which strands carry an alt allele (GT index > 0)
            # For multiallelic sites, GT can be 1, 2, 3, etc.
            # hap_idx tracks position in GT (0=first allele, 1=second) for per-haplotype FORMAT indexing
            strands_with_alleles = []
            if len(gt_parts) >= 1 and gt_parts[0] not in (".", "0"):
                try:
                    strands_with_alleles.append((1, int(gt_parts[0]), 0))
                except ValueError:
                    pass
            if len(gt_parts) >= 2 and gt_parts[1] not in (".", "0"):
                try:
                    strands_with_alleles.append((2, int(gt_parts[1]), 1))
                except ValueError:
                    pass
            if not strands_with_alleles:
                continue

            sample_id = sample_names[i]
            dp = parse_info_int(fmt, "DP") if "DP" in fmt else None
            gq = parse_info_int(fmt, "GQ") if "GQ" in fmt else None

            for strand, gt_idx, hap_idx in strands_with_alleles:
                # Resolve the specific alt allele (VCF GT is 1-indexed: 1=alt_list[0])
                if gt_idx - 1 >= len(alt_list):
                    continue
                specific_alt = alt_list[gt_idx - 1]
                computed_length = len(specific_alt) - len(ref)

                raw_id = f"{sample_id}_{strand}_{chrom_field}_{pos}_{ref}_{specific_alt}"
                # ES doc IDs have a 512-byte limit; hash long IDs (from large SVs)
                if len(raw_id) > 400:
                    doc_id = f"{sample_id}_{strand}_{chrom_field}_{pos}_{hashlib.md5(raw_id.encode()).hexdigest()}"
                else:
                    doc_id = raw_id

                # Per-haplotype FORMAT values (AM=methylation, AP=purity, MC=motif counts)
                allele_methylation = get_hap_value(fmt, "AM", hap_idx)
                allele_purity = get_hap_value(fmt, "AP", hap_idx)
                mc_val = fmt.get("MC")
                if mc_val and mc_val != ".":
                    mc_parts = mc_val.split(",")
                    mc_str = mc_parts[hap_idx] if hap_idx < len(mc_parts) else ""
                    if mc_str and mc_str != ".":
                        motif_counts = [int(x) for x in mc_str.split("_") if x]
                    else:
                        motif_counts = []
                else:
                    motif_counts = []

                if backend == "clickhouse":
                    # ClickHouse schema: scalar info_AF, separate ref/alt, no ES metadata
                    doc = {
                        "chrom": chrom_field,
                        "position": pos,
                        "sample_id": sample_id,
                        "strand": strand,
                        "ref": ref,
                        "alt": specific_alt,
                        "rsid": rsid or "",
                        "qual": qual or 0,
                        "filters": filters,
                        "info_AF": af or 0,
                        "info_AC": ac or 0,
                        "info_AN": an or 0,
                        "allele_type": allele_type or "",
                        "allele_length": computed_length,
                        "gnomad_v4_match_type": gnomad_v4_match_type or "",
                        "info_AF_afr": af_afr,
                        "info_AF_amr": af_amr,
                        "info_AF_eas": af_eas,
                        "info_AF_nfe": af_nfe,
                        "info_AF_sas": af_sas,
                        "gt_alleles": gt_alleles,
                        "gt_phased": 1 if gt_phased else 0,
                        "depth": dp,
                        "genotype_quality": gq,
                        "cadd_phred": cadd_phred,
                        "phylop": phylop,
                        "sv_consequences": sv_consequences,
                        "dbgap_id": dbgap_id or "",
                        "tr_id": tr_id or "",
                        "tr_motifs": tr_motifs or "",
                        "tr_struc": tr_struc or "",
                        "allele_methylation": allele_methylation,
                        "motif_counts": motif_counts,
                        "allele_purity": allele_purity,
                    }
                else:
                    doc = {
                        "document_id": doc_id,
                        "sample_id": sample_id,
                        "strand": strand,
                        "chrom": chrom_field,
                        "position": pos,
                        "alleles": [ref, specific_alt],
                        "rsid": rsid,
                        "qual": qual,
                        "filters": filters,
                        "info_AF": [af] if af is not None else [],
                        "info_AC": ac or 0,
                        "info_AN": an or 0,
                        "info_CM": [],
                        "info_SVTYPE": "",
                        "info_SVLEN": computed_length,
                        "gt_alleles": gt_alleles,
                        "gt_phased": gt_phased,
                        # New fields from v1 VCF
                        "allele_type": allele_type,
                        "allele_length": computed_length,
                        "depth": dp,
                        "genotype_quality": gq,
                        "gnomad_v4_match_type": gnomad_v4_match_type,
                        "info_AF_afr": af_afr,
                        "info_AF_amr": af_amr,
                        "info_AF_eas": af_eas,
                        "info_AF_nfe": af_nfe,
                        "info_AF_sas": af_sas,
                    }

                if backend != "clickhouse":
                    bulk_lines.append(
                        json.dumps({"index": {"_index": HAPLO_INDEX, "_type": "_doc", "_id": doc_id}})
                    )
                bulk_lines.append(json.dumps(doc))
                count += 1

                if len(bulk_lines) >= BATCH_SIZE * 2:
                    if backend == "clickhouse":
                        clickhouse_insert(ch_url, "lr_haplotypes", bulk_lines)
                    else:
                        es_bulk(es_url, bulk_lines)
                    print(f"  Inserted {count} docs so far ({variants_seen} variants processed)...")
                    bulk_lines = []

    if bulk_lines:
        if backend == "clickhouse":
            clickhouse_insert(ch_url, "lr_haplotypes", bulk_lines)
        else:
            es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} haplotype docs inserted from {variants_seen} variant sites")
    return count


# --- Haplotype loading (JSON mode, legacy) ---


def load_haplotypes(es_url, samples_json_path, region_start, region_stop):
    """Parse samples JSON and bulk-insert per-variant docs into ES."""
    print(f"\n=== Loading haplotypes from {samples_json_path} ===")

    with open(samples_json_path) as f:
        samples = json.load(f)

    print(f"  {len(samples)} samples found")

    delete_and_create_index(es_url, HAPLO_INDEX)

    bulk_lines = []
    count = 0

    for sample in samples:
        sample_id = sample["sample_id"]
        for strand_idx, variant_set in enumerate(sample["variant_sets"]):
            strand = strand_idx + 1  # 1-indexed
            for variant in variant_set["variants"]:
                position = variant["position"]
                # Filter to region if needed
                if position < region_start or position > region_stop:
                    continue

                chrom = variant.get("chrom", "chr1")
                alleles = variant.get("alleles", [])
                ref = alleles[0] if len(alleles) > 0 else ""
                alt = alleles[1] if len(alleles) > 1 else ""
                doc_id = f"{sample_id}_{strand}_{chrom}_{position}_{ref}_{alt}"

                doc = {
                    "document_id": doc_id,
                    "sample_id": sample_id,
                    "strand": strand,
                    "chrom": chrom,
                    "position": position,
                    "alleles": alleles,
                    "rsid": variant.get("rsid", ""),
                    "qual": variant.get("qual", 0),
                    "filters": variant.get("filters", []),
                    "info_AF": variant.get("info_AF", []),
                    "info_AC": variant.get("info_AC", 0),
                    "info_AN": variant.get("info_AN", 0),
                    "info_CM": variant.get("info_CM", []),
                    "info_SVTYPE": variant.get("info_SVTYPE", ""),
                    "info_SVLEN": variant.get("info_SVLEN", 0),
                    "gt_alleles": variant.get("GT_alleles", variant.get("gt_alleles", [])),
                    "gt_phased": variant.get("GT_phased", variant.get("gt_phased", True)),
                }

                bulk_lines.append(
                    json.dumps({"index": {"_index": HAPLO_INDEX, "_type": "_doc", "_id": doc_id}})
                )
                bulk_lines.append(json.dumps(doc))
                count += 1

                if len(bulk_lines) >= BATCH_SIZE * 2:
                    es_bulk(es_url, bulk_lines)
                    print(f"  Inserted {count} docs so far...")
                    bulk_lines = []

    if bulk_lines:
        es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} haplotype docs inserted")
    return count


# --- Coverage loading ---


def load_coverage(es_url, region_chrom, region_start, region_stop, downsample=0, backend="es", ch_url=None):
    """Stream v2 coverage TSV from GCS and load into ES or ClickHouse."""
    print(f"\n=== Loading coverage data ===")
    print(f"  Coverage: {GCS_COVERAGE_V2}")
    print(f"  Region: {region_chrom}:{region_start}-{region_stop}")

    # Auto-calculate downsample step
    region_size = region_stop - region_start
    if downsample > 0:
        step = downsample
    else:
        step = max(1, region_size // 10000)
    print(f"  Downsample step: every {step} bases")

    if backend == "es":
        delete_and_create_index(es_url, COVERAGE_INDEX)

    bulk_lines = []
    count = 0
    lines_scanned = 0
    last_pos = -step  # Track position for downsampling

    # Coverage TSV columns (headerless):
    # chrom, pos, pos, mean, median, total_bases, over_1, over_5, over_10, over_15, over_20, over_25, over_30, over_50, over_100
    for line in gcs_stream_gzip(GCS_COVERAGE_V2):
        line = line.rstrip("\n")
        if not line:
            continue

        parts = line.split("\t")
        if len(parts) < 15:
            continue

        chrom = parts[0]
        if chrom != region_chrom:
            # If we've already passed our chrom, stop early
            if lines_scanned > 0 and count > 0:
                break
            continue

        pos = int(parts[1])
        if pos < region_start:
            continue
        if pos > region_stop:
            break  # Coverage is sorted, so we can stop

        lines_scanned += 1

        # Downsample: only keep every Nth base
        if pos - last_pos < step:
            continue
        last_pos = pos

        doc = {
            "chrom": chrom,
            "pos": pos,
            "mean": float(parts[3]),
            "median": float(parts[4]),
            "over_1": float(parts[6]),
            "over_5": float(parts[7]),
            "over_10": float(parts[8]),
            "over_15": float(parts[9]),
            "over_20": float(parts[10]),
            "over_25": float(parts[11]),
            "over_30": float(parts[12]),
            "over_50": float(parts[13]),
            "over_100": float(parts[14]),
        }
        doc_id = f"{chrom}_{pos}"

        if backend != "clickhouse":
            bulk_lines.append(
                json.dumps({"index": {"_index": COVERAGE_INDEX, "_type": "_doc", "_id": doc_id}})
            )
        bulk_lines.append(json.dumps(doc))
        count += 1

        if len(bulk_lines) >= BATCH_SIZE * 2:
            if backend == "clickhouse":
                clickhouse_insert(ch_url, "lr_coverage", bulk_lines)
            else:
                es_bulk(es_url, bulk_lines)
            print(f"  Inserted {count} coverage docs so far ({lines_scanned} lines scanned)...")
            bulk_lines = []

    if bulk_lines:
        if backend == "clickhouse":
            clickhouse_insert(ch_url, "lr_coverage", bulk_lines)
        else:
            es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} coverage docs inserted ({lines_scanned} lines scanned in region)")
    return count


# --- Methylation loading ---


def _query_sample(args):
    """Query a single sample's BED file via genohype. Returns (sample_id, [(pos1, pos2, meth, cov), ...])."""
    genohype_bin, gcs_path, region_chrom, region_start, region_stop = args
    sample_id = gcs_path.rstrip("/").split("/")[-1].split(".")[0]

    proc = subprocess.Popen(
        [
            genohype_bin, "query", gcs_path,
            "--where", f"chrom={region_chrom}",
            "--where", f"begin>={region_start}",
            "--where", f"begin<={region_stop}",
            "--json",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    records = []
    for line in proc.stdout:
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        records.append((rec.get("begin", 0), rec.get("end", 0), rec.get("mod_score", 0.0), rec.get("cov", 0)))

    proc.wait()
    return sample_id, records


def load_methylation(es_url, region_chrom, region_start, region_stop, parallelism=16, backend="es", ch_url=None):
    """Query HPRC .bed.gz files via genohype, aggregate across samples, and load into ES or ClickHouse."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import time

    print(f"\n=== Loading methylation {'per-sample' if backend == 'clickhouse' else 'summary'} data ===")

    # Find genohype binary
    genohype_bin = os.environ.get("GENOHYPE_BIN", "genohype")
    result = subprocess.run([genohype_bin, "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ERROR: genohype not found at '{genohype_bin}'. Set GENOHYPE_BIN env var.")
        return 0
    print(f"  Using genohype: {genohype_bin}")

    files = gcs_list(GCS_METHYLATION_DIR)
    bedgz_files = [f for f in files if f.endswith(".bed.gz") and not f.endswith(".tbi")]

    if not bedgz_files:
        print("  No .bed.gz files found on GCS")
        return 0

    print(f"  Found {len(bedgz_files)} bed.gz files. Querying {parallelism} samples in parallel...")
    if backend == "es":
        delete_and_create_index(es_url, METHY_INDEX)

    # Query all samples in parallel
    agg_data = {}
    samples_completed = 0
    t0 = time.time()
    ch_bulk_lines = []
    ch_count = 0

    task_args = [(genohype_bin, gcs_path, region_chrom, region_start, region_stop) for gcs_path in bedgz_files]

    with ThreadPoolExecutor(max_workers=parallelism) as pool:
        futures = {pool.submit(_query_sample, args): args for args in task_args}
        for future in as_completed(futures):
            sample_id, records = future.result()

            if backend == "clickhouse":
                # Insert per-sample rows directly into lr_methylation
                for pos1, pos2, meth, cov in records:
                    doc = {
                        "chrom": region_chrom,
                        "pos1": pos1,
                        "pos2": pos2,
                        "sample_id": sample_id,
                        "methylation": meth,
                        "coverage": cov,
                    }
                    ch_bulk_lines.append(json.dumps(doc))
                    ch_count += 1
                    if len(ch_bulk_lines) >= BATCH_SIZE:
                        clickhouse_insert(ch_url, "lr_methylation", ch_bulk_lines)
                        print(f"  Inserted {ch_count} methylation rows so far...")
                        ch_bulk_lines = []
            else:
                for pos1, pos2, meth, cov in records:
                    if pos1 not in agg_data:
                        agg_data[pos1] = {"pos2": pos2, "samples": []}
                    agg_data[pos1]["samples"].append((sample_id, meth, cov))

            samples_completed += 1
            elapsed = time.time() - t0
            rate = samples_completed / elapsed if elapsed > 0 else 0
            eta = (len(bedgz_files) - samples_completed) / rate if rate > 0 else 0
            print(f"  [{samples_completed}/{len(bedgz_files)}] {sample_id}: {len(records)} sites | {rate:.1f} samples/s | ETA {eta:.0f}s")

    # Flush remaining ClickHouse rows
    if backend == "clickhouse":
        if ch_bulk_lines:
            clickhouse_insert(ch_url, "lr_methylation", ch_bulk_lines)
        print(f"  Total: {ch_count} per-sample methylation rows inserted")
        return ch_count

    print(f"  Aggregated {len(agg_data)} CpG sites across {samples_completed} samples")

    bulk_lines = []
    count = 0

    import math
    from collections import Counter

    OUTLIER_Z_THRESHOLD = 2.0  # flag samples > 2 std from mean

    # Track per-sample outlier counts and direction across all CpG sites
    sample_outlier_counts = Counter()  # sample_id -> number of outlier sites
    sample_hypo_counts = Counter()     # sites where sample is below mean
    sample_hyper_counts = Counter()    # sites where sample is above mean
    sample_total_sites = Counter()     # total sites seen per sample

    for pos1, data in sorted(agg_data.items()):
        samples = data["samples"]  # list of (sample_id, meth, cov)
        n = len(samples)
        values = [s[1] for s in samples]
        coverages = [s[2] for s in samples]
        mean_meth = sum(values) / n
        mean_cov = sum(coverages) / n
        min_meth = min(values)
        max_meth = max(values)
        variance = sum((v - mean_meth) ** 2 for v in values) / n
        std_meth = math.sqrt(variance)

        # Count outlier hits per sample
        if std_meth > 0:
            for sid, meth, _cov in samples:
                sample_total_sites[sid] += 1
                deviation = meth - mean_meth
                if abs(deviation) > OUTLIER_Z_THRESHOLD * std_meth:
                    sample_outlier_counts[sid] += 1
                    if deviation < 0:
                        sample_hypo_counts[sid] += 1
                    else:
                        sample_hyper_counts[sid] += 1

        doc_id = f"{region_chrom}_{pos1}"
        doc = {
            "document_id": doc_id,
            "chrom": region_chrom,
            "pos1": pos1,
            "pos2": data["pos2"],
            "mean_methylation": mean_meth,
            "mean_coverage": mean_cov,
            "num_samples": n,
            "std_methylation": std_meth,
            "min_methylation": min_meth,
            "max_methylation": max_meth,
        }

        bulk_lines.append(
            json.dumps({"index": {"_index": METHY_INDEX, "_type": "_doc", "_id": doc_id}})
        )
        bulk_lines.append(json.dumps(doc))
        count += 1

        if len(bulk_lines) >= BATCH_SIZE * 2:
            es_bulk(es_url, bulk_lines)
            print(f"  Inserted {count} summary docs so far...")
            bulk_lines = []

    if bulk_lines:
        es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} aggregated methylation summary docs inserted")

    # Build per-sample outlier ranking and store as a single doc
    total_sites = len(agg_data)
    ranking = []
    for sid in sorted(sample_outlier_counts, key=sample_outlier_counts.get, reverse=True):
        outlier_count = sample_outlier_counts[sid]
        hypo = sample_hypo_counts.get(sid, 0)
        hyper = sample_hyper_counts.get(sid, 0)
        direction = "hypo" if hypo > hyper else "hyper" if hyper > hypo else "mixed"
        ranking.append({
            "sample_id": sid,
            "outlier_count": outlier_count,
            "outlier_fraction": round(outlier_count / total_sites, 4) if total_sites > 0 else 0,
            "direction": direction,
        })

    ranking_doc = {
        "chrom": region_chrom,
        "start": region_start,
        "stop": region_stop,
        "total_cpg_sites": total_sites,
        "total_samples": samples_completed,
        "samples": ranking,
    }
    ranking_id = f"{region_chrom}_{region_start}_{region_stop}_outliers"

    # Store in the same index with a special doc type prefix
    OUTLIER_INDEX = "gnomad_r4_lr_methylation_outliers"
    try:
        req = urllib.request.Request(f"{es_url}/{OUTLIER_INDEX}", method="DELETE")
        urllib.request.urlopen(req)
    except urllib.error.HTTPError:
        pass
    bulk_lines = [
        json.dumps({"index": {"_index": OUTLIER_INDEX, "_type": "_doc", "_id": ranking_id}}),
        json.dumps(ranking_doc),
    ]
    es_bulk(es_url, bulk_lines)

    outlier_samples = [s for s in ranking if s["outlier_count"] > 0]
    print(f"  Outlier ranking: {len(outlier_samples)} samples with at least 1 outlier site (top: {ranking[0]['sample_id']}={ranking[0]['outlier_count']} sites)" if ranking else "  No outlier data")

    return count


# --- Gene model loading ---


GENE_REGION_QUERY = """
query GenesByRegion($chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
  region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    genes {
      gene_id
      symbol
      start
      stop
      transcripts {
        transcript_id
        start
        stop
        exons {
          feature_type
          start
          stop
        }
      }
      exons {
        feature_type
        start
        stop
      }
    }
  }
}
"""

CHUNK_SIZE = 1_000_000  # Query gnomAD API in 1MB chunks to avoid 400 errors


def fetch_genes_from_gnomad_api(api_url, chrom, start, stop):
    """Fetch gene models from the public gnomAD API, querying in 1MB chunks."""
    print(f"  Querying gnomAD API for genes in chr{chrom}:{start}-{stop}...")

    all_genes = {}
    chunk_start = start
    while chunk_start < stop:
        chunk_stop = min(chunk_start + CHUNK_SIZE, stop)
        payload = json.dumps({
            "query": GENE_REGION_QUERY,
            "variables": {
                "chrom": chrom,
                "start": chunk_start,
                "stop": chunk_stop,
                "referenceGenome": "GRCh38",
            },
        }).encode()

        req = urllib.request.Request(
            api_url,
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            resp = json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            print(f"  API error for chunk {chunk_start}-{chunk_stop}: {e.code}")
            chunk_start = chunk_stop
            continue

        if "errors" in resp:
            print(f"  API errors: {resp['errors']}")
            chunk_start = chunk_stop
            continue

        genes = resp.get("data", {}).get("region", {}).get("genes", [])
        for gene in genes:
            all_genes[gene["gene_id"]] = gene  # deduplicate by gene_id

        chunk_start = chunk_stop

    genes_list = list(all_genes.values())
    print(f"  Got {len(genes_list)} unique genes from gnomAD API")
    return genes_list


def load_genes(es_url, api_url, chrom, start, stop):
    """Fetch gene models from gnomAD API and load into ES."""
    print(f"\n=== Loading gene models ===")

    genes = fetch_genes_from_gnomad_api(api_url, chrom, start, stop)
    if not genes:
        print("  No genes found")
        return 0

    # Don't delete the genes index — it may have other data.
    # Just upsert the genes we have.
    bulk_lines = []
    count = 0

    for gene in genes:
        gene_id = gene["gene_id"]
        gene_start = gene["start"]
        gene_stop = gene["stop"]

        # Add chrom to gene data (not returned by RegionGene type)
        gene["chrom"] = chrom

        # Compute xstart/xstop: chrom_number * 1e9 + position
        try:
            chrom_num = int(chrom)
        except ValueError:
            chrom_num = 1  # fallback

        xstart = chrom_num * 1_000_000_000 + gene_start
        xstop = chrom_num * 1_000_000_000 + gene_stop

        # Build the ES document in gnomAD's expected format:
        # Top-level: gene_id, symbol_upper_case, xstart, xstop
        # Nested under value.*: all gene data
        doc = {
            "gene_id": gene_id,
            "symbol_upper_case": gene["symbol"].upper(),
            "xstart": xstart,
            "xstop": xstop,
            "value": gene,
        }

        bulk_lines.append(
            json.dumps({"index": {"_index": GENES_INDEX, "_type": "_doc", "_id": gene_id}})
        )
        bulk_lines.append(json.dumps(doc))
        count += 1

    if bulk_lines:
        es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} gene docs inserted")
    return count


# --- Sample metadata loading ---


def load_sample_metadata(ch_url):
    """Fetch HPRC sample metadata CSV and load into ClickHouse lr_sample_metadata table."""
    import csv
    import io

    print(f"\n=== Loading sample metadata from HPRC ===")
    print(f"  URL: {HPRC_METADATA_URL}")

    # Fetch CSV
    resp = urllib.request.urlopen(HPRC_METADATA_URL)
    content = resp.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    # Get sample IDs already in our haplotype table
    url = f"{ch_url}/?query=SELECT%20DISTINCT%20sample_id%20FROM%20lr_haplotypes%20FORMAT%20TabSeparated"
    try:
        our_samples = set(urllib.request.urlopen(url).read().decode().strip().split("\n"))
        print(f"  Found {len(our_samples)} samples in lr_haplotypes")
    except Exception:
        our_samples = None
        print("  Warning: could not query lr_haplotypes, loading all HPRC samples")

    rows = []
    for row in reader:
        sid = row["sample_id"]
        if our_samples and sid not in our_samples:
            continue
        subpop = row.get("population_abbreviation", "N/A") or "N/A"
        superpop = SUBPOP_TO_SUPERPOP.get(subpop, "N/A")
        pop_desc = row.get("population_descriptor", "N/A") or "N/A"
        sex = row.get("sex", "N/A") or "N/A"
        collection = row.get("collection", "N/A") or "N/A"
        rows.append(f"{sid}\t{subpop}\t{superpop}\t{pop_desc}\t{sex}\t{collection}")

    if not rows:
        print("  No matching samples found in HPRC metadata")
        return 0

    # Bulk insert into ClickHouse
    tsv_data = "\n".join(rows)
    req = urllib.request.Request(
        f"{ch_url}/?query=INSERT%20INTO%20lr_sample_metadata%20FORMAT%20TabSeparated",
        data=tsv_data.encode(),
        headers={"Content-Type": "text/tab-separated-values"},
    )
    urllib.request.urlopen(req)

    print(f"  Loaded {len(rows)} sample metadata rows")

    # Show superpopulation distribution
    url = f"{ch_url}/?query=SELECT%20superpopulation%2C%20count()%20AS%20n%20FROM%20lr_sample_metadata%20GROUP%20BY%20superpopulation%20ORDER%20BY%20n%20DESC%20FORMAT%20PrettyCompact"
    try:
        result = urllib.request.urlopen(url).read().decode()
        print(f"  Population distribution:\n{result}")
    except Exception:
        pass

    return len(rows)


# --- STR histogram loading ---


def load_str_histograms(ch_url, gcs_path=None, chrom_filter=None):
    """Stream AF histograms TSV from GCS and load into ClickHouse lr_str_histograms."""
    if gcs_path is None:
        gcs_path = GCS_AF_HISTOGRAMS_V2
    print(f"\n=== Loading STR histograms ===")
    print(f"  TSV: {gcs_path}")
    if chrom_filter:
        print(f"  Chrom filter: {chrom_filter}")

    bulk_lines = []
    count = 0
    header_cols = None
    pop_start_idx = 15  # population histogram columns start at index 15

    for line in gcs_stream_plain(gcs_path):
        line = line.rstrip("\n")
        if not line:
            continue

        parts = line.split("\t")

        # First line is header
        if header_cols is None:
            header_cols = parts
            print(f"  Header: {len(header_cols)} columns")
            continue

        if len(parts) < 15:
            continue

        # LocusId format: {chrom_num}-{start}-{end}-{motif}
        locus_id = parts[0]
        locus_parts = locus_id.split("-", 3)
        if len(locus_parts) < 4:
            continue

        chrom_num, start_str, end_str, motif = locus_parts
        chrom = f"chr{chrom_num}"

        if chrom_filter and chrom != chrom_filter:
            continue

        try:
            position = int(start_str)
            end_position = int(end_str)
        except ValueError:
            continue

        # Build populations map from per-pop columns
        populations = {}
        for col_idx in range(pop_start_idx, len(parts)):
            if col_idx < len(header_cols):
                pop_name = header_cols[col_idx]
                pop_val = parts[col_idx]
                if pop_val and pop_val != ".":
                    populations[pop_name] = pop_val

        def safe_float(val, default=0.0):
            if val == "." or val == "":
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default

        def safe_int(val, default=0):
            if val == "." or val == "":
                return default
            try:
                return int(val)
            except (ValueError, TypeError):
                return default

        doc = {
            "chrom": chrom,
            "position": position,
            "end_position": end_position,
            "motif": motif,
            "allele_size_histogram": parts[1] if len(parts) > 1 else "",
            "biallelic_histogram": parts[2] if len(parts) > 2 else "",
            "min_repeats": safe_float(parts[3]),
            "mode_repeats": safe_float(parts[4]),
            "mean_repeats": safe_float(parts[5]),
            "stdev_repeats": safe_float(parts[6]),
            "median_repeats": safe_float(parts[7]),
            "p99_repeats": safe_float(parts[8]),
            "max_repeats": safe_float(parts[9]),
            "unique_allele_lengths": safe_int(parts[10]),
            "num_called_alleles": safe_int(parts[11]),
            "populations": populations,
        }
        bulk_lines.append(json.dumps(doc))
        count += 1

        if len(bulk_lines) >= BATCH_SIZE:
            clickhouse_insert(ch_url, "lr_str_histograms", bulk_lines)
            print(f"  Inserted {count} histogram rows so far...")
            bulk_lines = []

    if bulk_lines:
        clickhouse_insert(ch_url, "lr_str_histograms", bulk_lines)

    print(f"  Total: {count} STR histogram rows inserted")
    return count


# --- Main ---


def parse_region(region_str):
    """Parse a region string like 'chr22:20000000-21000000' into (chrom, region_chrom, start, stop)."""
    region_parts = region_str.replace("chr", "").split(":")
    chrom = region_parts[0]
    region_chrom = f"chr{chrom}"
    start_stop = region_parts[1].split("-")
    region_start = int(start_stop[0])
    region_stop = int(start_stop[1])
    return chrom, region_chrom, region_start, region_stop


def check_backend(backend, es_url, ch_url):
    """Check backend connectivity and create CH tables if needed."""
    if backend == "es":
        try:
            es_request(es_url, "/_cluster/health")
            print("ES is reachable")
        except Exception as e:
            print(f"Cannot reach ES at {es_url}: {e}")
            sys.exit(1)
    else:
        try:
            url = f"{ch_url}/?query=SELECT%201"
            urllib.request.urlopen(url)
            print("ClickHouse is reachable")
        except Exception as e:
            print(f"Cannot reach ClickHouse at {ch_url}: {e}")
            sys.exit(1)
        ddl_dir = Path(__file__).parent / "clickhouse"
        for sql_file in ["lr_haplotypes.sql", "lr_variants.sql", "lr_methylation.sql", "lr_coverage.sql", "lr_methylation_summary_mv.sql", "lr_sample_metadata.sql", "lr_str_histograms.sql"]:
            ddl_path = ddl_dir / sql_file
            if ddl_path.exists():
                ddl = ddl_path.read_text()
                req = urllib.request.Request(
                    ch_url,
                    data=ddl.encode(),
                    headers={"Content-Type": "text/plain"},
                )
                urllib.request.urlopen(req)
                print(f"  Created table from {sql_file}")


def verify_counts(backend, es_url, ch_url, tables=None, indices=None):
    """Print verification counts for loaded datasets."""
    print("\n=== Verification ===")
    if backend == "clickhouse":
        for table in (tables or []):
            try:
                url = f"{ch_url}/?query=SELECT%20count()%20FROM%20{table}"
                resp = urllib.request.urlopen(url).read().decode().strip()
                print(f"  {table}: {resp} rows")
            except Exception:
                print(f"  {table}: (not found)")
    else:
        for idx in (indices or []):
            try:
                es_request(es_url, f"/{idx}/_refresh", data="", method="POST")
                resp = es_request(es_url, f"/{idx}/_count")
                print(f"  {idx}: {resp['count']} docs")
            except Exception:
                print(f"  {idx}: (not found)")


def cmd_haplotypes(args):
    """Subcommand: load haplotypes."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    check_backend(args.backend, args.es_url, args.clickhouse_url)

    if args.mode == "vcf":
        load_haplotypes_vcf(args.es_url, region_chrom, region_start, region_stop,
                            backend=args.backend, ch_url=args.clickhouse_url, vcf_path=args.vcf_path)
    else:
        gcs_path = GCS_SAMPLES_FULL if args.full else GCS_SAMPLES_AFEWGENES
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            gcs_download(gcs_path, tmp_path)
            load_haplotypes(args.es_url, tmp_path, region_start, region_stop)
        finally:
            os.unlink(tmp_path)

    if args.backend == "clickhouse":
        verify_counts(args.backend, args.es_url, args.clickhouse_url, tables=["lr_haplotypes"])
    else:
        verify_counts(args.backend, args.es_url, args.clickhouse_url, indices=[HAPLO_INDEX])


def cmd_coverage(args):
    """Subcommand: load coverage."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    check_backend(args.backend, args.es_url, args.clickhouse_url)

    load_coverage(args.es_url, region_chrom, region_start, region_stop, args.coverage_downsample,
                  backend=args.backend, ch_url=args.clickhouse_url)

    if args.backend == "clickhouse":
        verify_counts(args.backend, args.es_url, args.clickhouse_url, tables=["lr_coverage"])
    else:
        verify_counts(args.backend, args.es_url, args.clickhouse_url, indices=[COVERAGE_INDEX])


def cmd_methylation(args):
    """Subcommand: load methylation."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    check_backend(args.backend, args.es_url, args.clickhouse_url)

    load_methylation(args.es_url, region_chrom, region_start, region_stop, args.parallelism,
                     backend=args.backend, ch_url=args.clickhouse_url)

    if args.backend == "clickhouse":
        verify_counts(args.backend, args.es_url, args.clickhouse_url, tables=["lr_methylation"])
    else:
        verify_counts(args.backend, args.es_url, args.clickhouse_url, indices=[METHY_INDEX, "gnomad_r4_lr_methylation_outliers"])


def cmd_genes(args):
    """Subcommand: load gene models (ES only)."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    if args.backend != "es":
        print("Warning: genes are only loaded into Elasticsearch, ignoring --backend clickhouse")
    check_backend("es", args.es_url, args.clickhouse_url)

    load_genes(args.es_url, args.gnomad_api, chrom, region_start, region_stop)
    verify_counts("es", args.es_url, args.clickhouse_url, indices=[GENES_INDEX])


def cmd_metadata(args):
    """Subcommand: load sample metadata (ClickHouse only)."""
    if args.backend != "clickhouse":
        print("Warning: metadata is only loaded into ClickHouse, ignoring --backend es")
    check_backend("clickhouse", args.es_url, args.clickhouse_url)

    load_sample_metadata(args.clickhouse_url)
    verify_counts("clickhouse", args.es_url, args.clickhouse_url, tables=["lr_sample_metadata"])


def cmd_histograms(args):
    """Subcommand: load STR histograms (ClickHouse only)."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    if args.backend != "clickhouse":
        print("Warning: histograms are only loaded into ClickHouse, ignoring --backend es")
    check_backend("clickhouse", args.es_url, args.clickhouse_url)

    load_str_histograms(args.clickhouse_url, chrom_filter=region_chrom)
    verify_counts("clickhouse", args.es_url, args.clickhouse_url, tables=["lr_str_histograms"])


def cmd_variants(args):
    """Subcommand: load site-level variants (ClickHouse only)."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    if args.backend != "clickhouse":
        print("Warning: variants are only loaded into ClickHouse, ignoring --backend es")
    check_backend("clickhouse", args.es_url, args.clickhouse_url)

    load_variants_vcf(args.clickhouse_url, region_chrom, region_start, region_stop, vcf_path=args.vcf_path)
    verify_counts("clickhouse", args.es_url, args.clickhouse_url, tables=["lr_variants"])


def cmd_all(args):
    """Subcommand: load all applicable datasets (replicates original main() behavior)."""
    chrom, region_chrom, region_start, region_stop = parse_region(args.region)
    backend = args.backend
    check_backend(backend, args.es_url, args.clickhouse_url)

    print(f"Backend: {backend}")
    if backend == "es":
        print(f"ES URL: {args.es_url}")
    else:
        print(f"ClickHouse URL: {args.clickhouse_url}")
    print(f"Region: {region_chrom}:{region_start}-{region_stop}")

    # Load haplotypes
    if args.mode == "vcf":
        load_haplotypes_vcf(args.es_url, region_chrom, region_start, region_stop,
                            backend=backend, ch_url=args.clickhouse_url, vcf_path=args.vcf_path)
    else:
        gcs_path = GCS_SAMPLES_FULL if args.full else GCS_SAMPLES_AFEWGENES
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            gcs_download(gcs_path, tmp_path)
            load_haplotypes(args.es_url, tmp_path, region_start, region_stop)
        finally:
            os.unlink(tmp_path)

    # Load coverage (VCF mode only)
    if args.mode == "vcf":
        load_coverage(args.es_url, region_chrom, region_start, region_stop, args.coverage_downsample,
                      backend=backend, ch_url=args.clickhouse_url)

    # Load methylation
    load_methylation(args.es_url, region_chrom, region_start, region_stop, args.parallelism,
                     backend=backend, ch_url=args.clickhouse_url)

    # Load variants (ClickHouse only)
    if backend == "clickhouse":
        load_variants_vcf(args.clickhouse_url, region_chrom, region_start, region_stop, vcf_path=args.vcf_path)

    # Load STR histograms (ClickHouse only)
    if backend == "clickhouse":
        load_str_histograms(args.clickhouse_url, chrom_filter=region_chrom)

    # Load gene models (ES only)
    if backend == "es":
        load_genes(args.es_url, args.gnomad_api, chrom, region_start, region_stop)

    # Load sample metadata (ClickHouse only)
    if backend == "clickhouse":
        load_sample_metadata(args.clickhouse_url)

    # Verify counts
    if backend == "clickhouse":
        verify_counts(backend, args.es_url, args.clickhouse_url,
                      tables=["lr_haplotypes", "lr_variants", "lr_methylation", "lr_coverage", "lr_sample_metadata", "lr_str_histograms"])
    else:
        verify_counts(backend, args.es_url, args.clickhouse_url,
                      indices=[HAPLO_INDEX, METHY_INDEX, "gnomad_r4_lr_methylation_outliers", COVERAGE_INDEX, GENES_INDEX])

    print("\nDone! Test URLs:")
    print(f"  http://localhost:8008/haplotype/region/{chrom}-{region_start}-{region_stop}")
    print(f"  http://localhost:8008/haplotype/region/{chrom}-{region_start}-{min(region_start + 100000, region_stop)}")


def main():
    parser = argparse.ArgumentParser(description="Load real HPRC data into local datastore")

    # Shared arguments on the parent parser
    parser.add_argument("--backend", choices=["es", "clickhouse"], default="es", help="Target datastore")
    parser.add_argument("--es-url", default="http://127.0.0.1:9200", help="Elasticsearch URL")
    parser.add_argument("--clickhouse-url", default="http://127.0.0.1:8123", help="ClickHouse URL")
    parser.add_argument("--region", default="chr22:20000000-21000000", help="Region to load (format: chrN:start-stop)")
    parser.add_argument("--parallelism", type=int, default=16, help="Number of parallel genohype queries for methylation")
    parser.add_argument("--vcf-path", default=None, help="Override VCF path (default: GCS_VCF_V2)")
    parser.add_argument("--gnomad-api", default=GNOMAD_API, help="gnomAD API URL for gene models")
    parser.add_argument("--full", action="store_true", help="Load full chromosome (requires 4+ GB ES heap)")
    parser.add_argument("--coverage-downsample", type=int, default=0, help="Sample every Nth base for coverage (default: auto)")

    subparsers = parser.add_subparsers(dest="command")

    # haplotypes
    haplo_parser = subparsers.add_parser("haplotypes", help="Load haplotype data")
    haplo_parser.add_argument("--mode", choices=["vcf", "json"], default="vcf", help="Loader mode: vcf (v2 VCF) or json (legacy samples JSON)")
    haplo_parser.set_defaults(func=cmd_haplotypes)

    # coverage
    cov_parser = subparsers.add_parser("coverage", help="Load coverage data")
    cov_parser.set_defaults(func=cmd_coverage)

    # methylation
    methy_parser = subparsers.add_parser("methylation", help="Load methylation data")
    methy_parser.set_defaults(func=cmd_methylation)

    # genes
    genes_parser = subparsers.add_parser("genes", help="Load gene models from gnomAD API (ES only)")
    genes_parser.set_defaults(func=cmd_genes)

    # metadata
    meta_parser = subparsers.add_parser("metadata", help="Load sample metadata from HPRC (ClickHouse only)")
    meta_parser.set_defaults(func=cmd_metadata)

    # histograms
    hist_parser = subparsers.add_parser("histograms", help="Load STR histograms (ClickHouse only)")
    hist_parser.set_defaults(func=cmd_histograms)

    # variants
    var_parser = subparsers.add_parser("variants", help="Load site-level variants (ClickHouse only)")
    var_parser.set_defaults(func=cmd_variants)

    # all
    all_parser = subparsers.add_parser("all", help="Load all applicable datasets")
    all_parser.add_argument("--mode", choices=["vcf", "json"], default="vcf", help="Loader mode: vcf (v2 VCF) or json (legacy samples JSON)")
    all_parser.set_defaults(func=cmd_all)

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
