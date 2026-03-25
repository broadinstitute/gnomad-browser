#!/usr/bin/env python3
"""Load real HPRC haplotype data, methylation, coverage, and gene models into local Elasticsearch.

Supports two modes:
  - vcf (default): Stream the v1 reformatted VCF (232 samples, chr22) from GCS
  - json (legacy): Download pre-computed samples JSON from the old HPRC prototype

Usage:
    python3 development/load_real_haplotype_data.py                # VCF mode, chr22:20M-21M (default)
    python3 development/load_real_haplotype_data.py --full          # full chr22 (requires 4+ GB ES heap)
    python3 development/load_real_haplotype_data.py --mode json     # old JSON mode (chr1 prototype)
    python3 development/load_real_haplotype_data.py --skip-coverage # skip coverage loading
    python3 development/load_real_haplotype_data.py --skip-genes    # skip gene model loading
"""
import argparse
import gzip
import hashlib
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
GCS_METHYLATION_DIR = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-26/methylation_files/"

# GCS paths — new v1/v2 datasets
GCS_VCF_V1 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v1/hprc_chr22.reformatted.vcf.gz"
GCS_COVERAGE_V2 = "gs://gnomad-v4-data-pipeline/inputs/secondary-analyses/gnomAD-LR/v2/hgsvc_hprc.coverage.tsv.gz"

# ES indices
HAPLO_INDEX = "gnomad_r4_lr_haplotypes"
METHY_INDEX = "gnomad_r4_lr_methylation"
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


def load_haplotypes_vcf(es_url, region_chrom, region_start, region_stop):
    """Stream the v1 reformatted VCF from GCS and load per-carrier docs into ES."""
    print(f"\n=== Loading haplotypes from VCF (streaming from GCS) ===")
    print(f"  VCF: {GCS_VCF_V1}")
    print(f"  Region: {region_chrom}:{region_start}-{region_stop}")

    delete_and_create_index(es_url, HAPLO_INDEX)

    sample_names = []
    bulk_lines = []
    count = 0
    variants_seen = 0

    for line in gcs_stream_gzip(GCS_VCF_V1):
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
        alt = parts[4]
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

            # Determine which strands carry the alt allele
            strands = []
            if len(gt_parts) >= 1 and gt_parts[0] == "1":
                strands.append(1)
            if len(gt_parts) >= 2 and gt_parts[1] == "1":
                strands.append(2)
            if not strands:
                continue

            sample_id = sample_names[i]
            dp = parse_info_int(fmt, "DP") if "DP" in fmt else None
            gq = parse_info_int(fmt, "GQ") if "GQ" in fmt else None

            for strand in strands:
                raw_id = f"{sample_id}_{strand}_{chrom_field}_{pos}_{ref}_{alt}"
                # ES doc IDs have a 512-byte limit; hash long IDs (from large SVs)
                if len(raw_id) > 400:
                    doc_id = f"{sample_id}_{strand}_{chrom_field}_{pos}_{hashlib.md5(raw_id.encode()).hexdigest()}"
                else:
                    doc_id = raw_id
                doc = {
                    "document_id": doc_id,
                    "sample_id": sample_id,
                    "strand": strand,
                    "chrom": chrom_field,
                    "position": pos,
                    "alleles": [ref, alt],
                    "rsid": rsid,
                    "qual": qual,
                    "filters": filters,
                    "info_AF": [af] if af is not None else [],
                    "info_AC": ac or 0,
                    "info_AN": an or 0,
                    "info_CM": [],
                    "info_SVTYPE": "",
                    "info_SVLEN": 0,
                    "gt_alleles": gt_alleles,
                    "gt_phased": gt_phased,
                    # New fields from v1 VCF
                    "allele_type": allele_type,
                    "allele_length": allele_length,
                    "depth": dp,
                    "genotype_quality": gq,
                    "gnomad_v4_match_type": gnomad_v4_match_type,
                    "info_AF_afr": af_afr,
                    "info_AF_amr": af_amr,
                    "info_AF_eas": af_eas,
                    "info_AF_nfe": af_nfe,
                    "info_AF_sas": af_sas,
                }

                bulk_lines.append(
                    json.dumps({"index": {"_index": HAPLO_INDEX, "_type": "_doc", "_id": doc_id}})
                )
                bulk_lines.append(json.dumps(doc))
                count += 1

                if len(bulk_lines) >= BATCH_SIZE * 2:
                    es_bulk(es_url, bulk_lines)
                    print(f"  Inserted {count} docs so far ({variants_seen} variants processed)...")
                    bulk_lines = []

    if bulk_lines:
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


def load_coverage(es_url, region_chrom, region_start, region_stop, downsample=0):
    """Stream v2 coverage TSV from GCS and load into ES."""
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

        bulk_lines.append(
            json.dumps({"index": {"_index": COVERAGE_INDEX, "_type": "_doc", "_id": doc_id}})
        )
        bulk_lines.append(json.dumps(doc))
        count += 1

        if len(bulk_lines) >= BATCH_SIZE * 2:
            es_bulk(es_url, bulk_lines)
            print(f"  Inserted {count} coverage docs so far ({lines_scanned} lines scanned)...")
            bulk_lines = []

    if bulk_lines:
        es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} coverage docs inserted ({lines_scanned} lines scanned in region)")
    return count


# --- Methylation loading ---


def load_methylation(es_url, region_chrom, region_start, region_stop):
    """Download methylation bedgraphs from GCS and load into ES."""
    print(f"\n=== Loading methylation data ===")

    files = gcs_list(GCS_METHYLATION_DIR)
    bedgraph_files = [f for f in files if f.endswith(".bedgraph")]

    if not bedgraph_files:
        print("  No bedgraph files found on GCS")
        return 0

    print(f"  Found {len(bedgraph_files)} bedgraph files")
    delete_and_create_index(es_url, METHY_INDEX)

    bulk_lines = []
    count = 0

    with tempfile.TemporaryDirectory() as tmpdir:
        for gcs_path in bedgraph_files:
            filename = os.path.basename(gcs_path)
            local_path = os.path.join(tmpdir, filename)
            gcs_download(gcs_path, local_path)

            # Derive sample_id from filename (e.g., "highpromoter.0.bedgraph" -> "highpromoter_0")
            sample_id = filename.replace(".bedgraph", "").replace(".", "_")

            with open(local_path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#") or line.startswith("track"):
                        continue
                    parts = line.split("\t")
                    if len(parts) < 4:
                        continue

                    chrom = parts[0]
                    start = int(parts[1])
                    end = int(parts[2])
                    methylation_pct = float(parts[3])

                    # Filter to region of interest
                    if chrom != region_chrom:
                        continue
                    if end < region_start or start > region_stop:
                        continue

                    doc_id = f"{sample_id}_{chrom}_{start}"
                    doc = {
                        "document_id": doc_id,
                        "sample_id": sample_id,
                        "chrom": chrom,
                        "pos1": start,
                        "pos2": end,
                        "methylation": methylation_pct,
                    }

                    bulk_lines.append(
                        json.dumps({"index": {"_index": METHY_INDEX, "_type": "_doc", "_id": doc_id}})
                    )
                    bulk_lines.append(json.dumps(doc))
                    count += 1

                    if len(bulk_lines) >= BATCH_SIZE * 2:
                        es_bulk(es_url, bulk_lines)
                        print(f"  Inserted {count} methylation docs so far...")
                        bulk_lines = []

    if bulk_lines:
        es_bulk(es_url, bulk_lines)

    print(f"  Total: {count} methylation docs inserted")
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


# --- Main ---


def main():
    parser = argparse.ArgumentParser(description="Load real HPRC data into local ES")
    parser.add_argument("--es-url", default="http://127.0.0.1:9200", help="Elasticsearch URL")
    parser.add_argument("--full", action="store_true", help="Load full chromosome (requires 4+ GB ES heap)")
    parser.add_argument("--mode", choices=["vcf", "json"], default="vcf", help="Loader mode: vcf (new v1 VCF) or json (old samples JSON)")
    parser.add_argument("--skip-haplo", action="store_true", help="Skip haplotype loading")
    parser.add_argument("--skip-methy", action="store_true", help="Skip methylation loading")
    parser.add_argument("--skip-coverage", action="store_true", help="Skip coverage loading")
    parser.add_argument("--skip-genes", action="store_true", help="Skip gene model loading")
    parser.add_argument("--coverage-downsample", type=int, default=0, help="Sample every Nth base for coverage (default: auto)")
    parser.add_argument("--gnomad-api", default=GNOMAD_API, help="gnomAD API URL for gene models")
    parser.add_argument("--region", default="chr22:20000000-21000000", help="Region to load (format: chrN:start-stop)")
    args = parser.parse_args()

    # Parse region
    region_parts = args.region.replace("chr", "").split(":")
    chrom = region_parts[0]
    region_chrom = f"chr{chrom}"
    start_stop = region_parts[1].split("-")
    region_start = int(start_stop[0])
    region_stop = int(start_stop[1])

    mode_label = f"VCF mode ({GCS_VCF_V1.split('/')[-1]})" if args.mode == "vcf" else "JSON mode (legacy)"
    print(f"ES URL: {args.es_url}")
    print(f"Region: {region_chrom}:{region_start}-{region_stop}")
    print(f"Mode: {mode_label}")

    # Check ES is reachable
    try:
        es_request(args.es_url, "/_cluster/health")
        print("ES is reachable")
    except Exception as e:
        print(f"Cannot reach ES at {args.es_url}: {e}")
        sys.exit(1)

    # Load haplotypes
    if not args.skip_haplo:
        if args.mode == "vcf":
            load_haplotypes_vcf(args.es_url, region_chrom, region_start, region_stop)
        else:
            gcs_path = GCS_SAMPLES_FULL if args.full else GCS_SAMPLES_AFEWGENES
            with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
                tmp_path = tmp.name
            try:
                gcs_download(gcs_path, tmp_path)
                load_haplotypes(args.es_url, tmp_path, region_start, region_stop)
            finally:
                os.unlink(tmp_path)

    # Load coverage (VCF mode only — old JSON data has no coverage)
    if not args.skip_coverage and args.mode == "vcf":
        load_coverage(args.es_url, region_chrom, region_start, region_stop, args.coverage_downsample)

    # Load methylation
    if not args.skip_methy:
        load_methylation(args.es_url, region_chrom, region_start, region_stop)

    # Load gene models
    if not args.skip_genes:
        load_genes(args.es_url, args.gnomad_api, chrom, region_start, region_stop)

    # Verify counts
    print("\n=== Verification ===")
    for idx in [HAPLO_INDEX, METHY_INDEX, COVERAGE_INDEX, GENES_INDEX]:
        try:
            # Force refresh before counting
            es_request(args.es_url, f"/{idx}/_refresh", data="", method="POST")
            resp = es_request(args.es_url, f"/{idx}/_count")
            print(f"  {idx}: {resp['count']} docs")
        except Exception:
            print(f"  {idx}: (not found)")

    print("\nDone! Test URLs:")
    print(f"  http://localhost:8008/haplotype/region/{chrom}-{region_start}-{region_stop}")
    print(f"  http://localhost:8008/haplotype/region/{chrom}-{region_start}-{min(region_start + 100000, region_stop)}")


if __name__ == "__main__":
    main()
