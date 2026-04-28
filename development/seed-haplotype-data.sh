#!/bin/bash
# Seed local Elasticsearch with test haplotype and methylation data
# Usage: ./development/seed-haplotype-data.sh [ES_URL]

set -eu

ES_URL="${1:-http://localhost:9200}"

echo "Seeding haplotype data into Elasticsearch at $ES_URL..."

# Wait for ES to be ready
echo "Waiting for Elasticsearch..."
until curl -s "$ES_URL/_cluster/health" > /dev/null 2>&1; do
  sleep 1
done
echo "Elasticsearch is ready."

# Create haplotypes index
echo "Creating gnomad_r4_lr_haplotypes index..."
curl -s -X PUT "$ES_URL/gnomad_r4_lr_haplotypes" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "_doc": {
      "properties": {
        "document_id": { "type": "keyword" },
        "sample_id": { "type": "keyword" },
        "strand": { "type": "integer" },
        "chrom": { "type": "keyword" },
        "position": { "type": "integer" },
        "alleles": { "type": "keyword" },
        "rsid": { "type": "keyword" },
        "qual": { "type": "float" },
        "filters": { "type": "keyword" },
        "info_AF": { "type": "float" },
        "info_AC": { "type": "integer" },
        "info_AN": { "type": "integer" },
        "info_CM": { "type": "float" },
        "info_SVTYPE": { "type": "keyword" },
        "info_SVLEN": { "type": "integer" },
        "gt_alleles": { "type": "integer" },
        "gt_phased": { "type": "boolean" }
      }
    }
  }
}' | jq .

# Create methylation index
echo "Creating gnomad_r4_lr_methylation index..."
curl -s -X PUT "$ES_URL/gnomad_r4_lr_methylation" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "_doc": {
      "properties": {
        "document_id": { "type": "keyword" },
        "sample_id": { "type": "keyword" },
        "chrom": { "type": "keyword" },
        "pos1": { "type": "integer" },
        "pos2": { "type": "integer" },
        "methylation": { "type": "float" }
      }
    }
  }
}' | jq .

# Seed haplotype test data - 6 samples, 2 strands, region chr1:100000000-100100000
# This mimics the HPRC chr1 test data structure
echo "Seeding haplotype variant documents..."

SAMPLES=("HG002" "HG003" "HG004" "HG005" "HG006" "HG007")
POSITIONS=(100038008 100042500 100055000 100062000 100075000 100088000)
REF_ALLELES=("A" "C" "G" "T" "A" "ATCG")
ALT_ALLELES=("G" "T" "A" "C" "ATCGATCG" "A")
AFS=(0.85 0.42 0.15 0.72 0.03 0.55)
RSIDS=("rs12345" "rs23456" "rs34567" "rs45678" "rs56789" "rs67890")
SVTYPES=("" "" "" "" "INS" "DEL")
SVLENS=(0 0 0 0 4 3)

BULK_DATA=""
DOC_COUNT=0

for sample_idx in "${!SAMPLES[@]}"; do
  sample="${SAMPLES[$sample_idx]}"
  for strand in 1 2; do
    # Each sample gets a subset of variants based on strand
    if [ $strand -eq 1 ]; then
      var_indices=(0 1 2 3)
    else
      var_indices=(2 3 4 5)
    fi

    for var_idx in "${var_indices[@]}"; do
      pos="${POSITIONS[$var_idx]}"
      ref="${REF_ALLELES[$var_idx]}"
      alt="${ALT_ALLELES[$var_idx]}"
      af="${AFS[$var_idx]}"
      rsid="${RSIDS[$var_idx]}"
      svtype="${SVTYPES[$var_idx]}"
      svlen="${SVLENS[$var_idx]}"
      doc_id="${sample}_${strand}_chr1_${pos}_${ref}_${alt}"

      svtype_field=""
      if [ -n "$svtype" ]; then
        svtype_field="\"info_SVTYPE\": \"$svtype\","
        svtype_field="$svtype_field \"info_SVLEN\": $svlen,"
      fi

      BULK_DATA+='{"index":{"_index":"gnomad_r4_lr_haplotypes","_type":"_doc","_id":"'"$doc_id"'"}}'
      BULK_DATA+=$'\n'
      BULK_DATA+='{"document_id":"'"$doc_id"'","sample_id":"'"$sample"'","strand":'"$strand"',"chrom":"chr1","position":'"$pos"',"alleles":["'"$ref"'","'"$alt"'"],"rsid":"'"$rsid"'","qual":30.0,"filters":["PASS"],"info_AF":['"$af"'],"info_AC":10,"info_AN":94,'"$svtype_field"'"gt_alleles":[0,1],"gt_phased":true}'
      BULK_DATA+=$'\n'
      DOC_COUNT=$((DOC_COUNT + 1))
    done
  done
done

echo "$BULK_DATA" | curl -s -X POST "$ES_URL/_bulk" -H 'Content-Type: application/x-ndjson' --data-binary @- | jq '{took: .took, errors: .errors, items_count: (.items | length)}'
echo "Inserted $DOC_COUNT haplotype documents."

# Seed methylation test data
echo "Seeding methylation documents..."

METH_BULK=""
METH_COUNT=0
METH_SAMPLES=("sample_1_high" "sample_2_normal" "sample_3_high" "sample_4_normal")

for meth_sample in "${METH_SAMPLES[@]}"; do
  for pos in $(seq 100000000 5000 100100000); do
    # Generate methylation value: "high" samples get higher values
    if [[ "$meth_sample" == *"high"* ]]; then
      meth_val=$(awk "BEGIN{printf \"%.2f\", 50 + (($pos - 100000000) % 50)}")
    else
      meth_val=$(awk "BEGIN{printf \"%.2f\", 10 + (($pos - 100000000) % 30)}")
    fi
    pos2=$((pos + 1))
    doc_id="${meth_sample}_chr1_${pos}"

    METH_BULK+='{"index":{"_index":"gnomad_r4_lr_methylation","_type":"_doc","_id":"'"$doc_id"'"}}'
    METH_BULK+=$'\n'
    METH_BULK+='{"document_id":"'"$doc_id"'","sample_id":"'"$meth_sample"'","chrom":"chr1","pos1":'"$pos"',"pos2":'"$pos2"',"methylation":'"$meth_val"'}'
    METH_BULK+=$'\n'
    METH_COUNT=$((METH_COUNT + 1))
  done
done

echo "$METH_BULK" | curl -s -X POST "$ES_URL/_bulk" -H 'Content-Type: application/x-ndjson' --data-binary @- | jq '{took: .took, errors: .errors, items_count: (.items | length)}'
echo "Inserted $METH_COUNT methylation documents."

# --- ClickHouse tables ---
CH_URL="${2:-http://localhost:8123}"

echo "Creating ClickHouse tables..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for sql_file in lr_haplotypes.sql lr_methylation.sql lr_coverage.sql lr_methylation_summary_mv.sql lr_sample_metadata.sql lr_str_histograms.sql; do
  sql_path="$SCRIPT_DIR/clickhouse/$sql_file"
  if [ -f "$sql_path" ]; then
    curl -s "$CH_URL" --data-binary @"$sql_path" > /dev/null 2>&1 && echo "  Created table from $sql_file" || echo "  Skipped $sql_file (ClickHouse not available)"
  fi
done

# Verify
echo ""
echo "=== Verification ==="
echo "Haplotype docs: $(curl -s "$ES_URL/gnomad_r4_lr_haplotypes/_count" | jq .count)"
echo "Methylation docs: $(curl -s "$ES_URL/gnomad_r4_lr_methylation/_count" | jq .count)"
echo ""
echo "Done! Test region: chr1:100000000-100100000"
echo "Test URL: http://localhost:8008/haplotype/region/1-100000000-100100000"
