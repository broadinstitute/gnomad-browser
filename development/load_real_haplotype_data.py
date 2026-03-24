#!/usr/bin/env python3
"""Load real HPRC haplotype data, methylation, and gene models into local Elasticsearch.

Downloads pre-computed samples JSON from GCS, methylation bedgraphs, and gene models
from the public gnomAD API, then bulk-inserts everything into local ES.

Usage:
    python3 development/load_real_haplotype_data.py                # afewgenes (fast, ~1 MB)
    python3 development/load_real_haplotype_data.py --full          # full chr1 (554 MB)
    python3 development/load_real_haplotype_data.py --skip-genes    # skip gene model loading
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

# GCS paths
GCS_SAMPLES_AFEWGENES = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-19/afewgenes/samples-fff0695d-484f-417d-861b-f0500a0f9aa0.json"
GCS_SAMPLES_FULL = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-20/chr1_hpcr/samples-e6103797-2e6c-46a3-b12d-c82c4b2a6c8c.json"
GCS_METHYLATION_DIR = "gs://gnomad-v4-data-pipeline/inputs/haploytype_input/2024-06-26/methylation_files/"

# ES indices
HAPLO_INDEX = "gnomad_r4_lr_haplotypes"
METHY_INDEX = "gnomad_r4_lr_methylation"
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
    resp = json.loads(urllib.request.urlopen(req).read())
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


# --- Haplotype loading ---


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
    parser.add_argument("--full", action="store_true", help="Use full chr1 dataset (554 MB) instead of afewgenes (1.1 MB)")
    parser.add_argument("--skip-haplo", action="store_true", help="Skip haplotype loading")
    parser.add_argument("--skip-methy", action="store_true", help="Skip methylation loading")
    parser.add_argument("--skip-genes", action="store_true", help="Skip gene model loading")
    parser.add_argument("--gnomad-api", default=GNOMAD_API, help="gnomAD API URL for gene models")
    parser.add_argument("--region", default="chr1:100000000-110000000", help="Region to load (format: chrN:start-stop)")
    args = parser.parse_args()

    # Parse region
    region_parts = args.region.replace("chr", "").split(":")
    chrom = region_parts[0]
    region_chrom = f"chr{chrom}"
    start_stop = region_parts[1].split("-")
    region_start = int(start_stop[0])
    region_stop = int(start_stop[1])

    print(f"ES URL: {args.es_url}")
    print(f"Region: {region_chrom}:{region_start}-{region_stop}")
    print(f"Dataset: {'full chr1 (554 MB)' if args.full else 'afewgenes (1.1 MB)'}")

    # Check ES is reachable
    try:
        es_request(args.es_url, "/_cluster/health")
        print("ES is reachable")
    except Exception as e:
        print(f"Cannot reach ES at {args.es_url}: {e}")
        sys.exit(1)

    # Load haplotypes
    if not args.skip_haplo:
        gcs_path = GCS_SAMPLES_FULL if args.full else GCS_SAMPLES_AFEWGENES
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            gcs_download(gcs_path, tmp_path)
            load_haplotypes(args.es_url, tmp_path, region_start, region_stop)
        finally:
            os.unlink(tmp_path)

    # Load methylation
    if not args.skip_methy:
        load_methylation(args.es_url, region_chrom, region_start, region_stop)

    # Load gene models
    if not args.skip_genes:
        load_genes(args.es_url, args.gnomad_api, chrom, region_start, region_stop)

    # Verify counts
    print("\n=== Verification ===")
    for idx in [HAPLO_INDEX, METHY_INDEX, GENES_INDEX]:
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
