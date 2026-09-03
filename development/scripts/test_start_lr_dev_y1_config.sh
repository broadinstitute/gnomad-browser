#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

port_output="$(
    LR_DEV_DRY_RUN=1 \
    LR_Y1_CLICKHOUSE_URL=http://inherited-legacy.example:8123 \
    LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_wrong_database \
    CLICKHOUSE_URL=http://generic-legacy.example:8123 \
    "$ROOT_DIR/start_lr_dev.sh" --gcp-clickhouse --y1-clickhouse-port 9134 \
      --y1-clickhouse-vm gnomad-lr-y1-full-genome-clickhouse
)"
grep -q '^mode=y1$' <<<"$port_output"
grep -q '^LR_Y1_ENABLED=true$' <<<"$port_output"
grep -q '^LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:9134$' <<<"$port_output"
grep -q '^LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_wrong_database$' <<<"$port_output"
grep -q '^LR_Y1_GCP_CH_VM=gnomad-lr-y1-full-genome-clickhouse$' <<<"$port_output"
if grep -Eq 'inherited-legacy|CHR22_MIXED|RUN_ID|published|candidate|accepted.*r2' <<<"$port_output"; then
    echo "inherited or obsolete Y1 configuration leaked into launcher output" >&2
    exit 1
fi

gcp_only_output="$(
    env -u LR_Y1_CLICKHOUSE_URL -u LR_Y1_ENABLED \
      LR_DEV_DRY_RUN=1 CLICKHOUSE_URL=http://generic-legacy.example:8123 \
      "$ROOT_DIR/start_lr_dev.sh" --gcp-clickhouse
)"
grep -q '^mode=y1$' <<<"$gcp_only_output"
grep -q '^CLICKHOUSE_URL=http://127.0.0.1:8126$' <<<"$gcp_only_output"
grep -q '^LR_Y1_ENABLED=true$' <<<"$gcp_only_output"
grep -q '^LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:8126$' <<<"$gcp_only_output"
grep -q '^LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_scratch_demo_full_genome_20260803$' <<<"$gcp_only_output"
grep -q '^LR_Y1_GCP_CH_VM=gnomad-lr-y1-full-genome-clickhouse$' <<<"$gcp_only_output"
grep -q "^LR_Y1_PRIMARY_MANIFEST_PATH=$ROOT_DIR/graphql-api/config/y1-presentation-primary-manifests.json$" <<<"$gcp_only_output"
grep -q "^LR_Y1_REPRESENTED_LENGTH_RULE_PATH=$ROOT_DIR/graphql-api/config/y1-represented-length-source-contract.json$" <<<"$gcp_only_output"
if grep -q '/app/graphql-api' <<<"$gcp_only_output"; then
    echo "container-only paths leaked into local full-genome configuration" >&2
    exit 1
fi

legacy_output="$(LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" --legacy-clickhouse)"
grep -q '^mode=legacy$' <<<"$legacy_output"
grep -q '^CLICKHOUSE_URL=http://127.0.0.1:8125$' <<<"$legacy_output"
if grep -q '^LR_Y1_ENABLED=' <<<"$legacy_output"; then
    echo "--legacy-clickhouse incorrectly selected Y1 provenance mode" >&2
    exit 1
fi

url_output="$(
    LR_DEV_DRY_RUN=1 \
    LR_Y1_CLICKHOUSE_URL=http://clickhouse.test:8123 \
    LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_test_fixture \
    LR_Y1_RUN_MAP='{"hgsvc_hprc":{"chr1":"run-1"}}' \
    LR_Y1_PRIMARY_MANIFEST_PATH=/tmp/primary-manifests.json \
    LR_Y1_REPRESENTED_LENGTH_RULE_PATH=/tmp/represented-length-receipt.json \
    LR_Y1_ANCILLARY_ROUTES='{"coverage":{"hgsvc_hprc":{"database":"gnomad_lr_y1_cov","run_id":"cov-1","receipt_path":"/tmp/cov-receipt.json"}}}' \
    "$ROOT_DIR/start_lr_dev.sh"
)"
grep -q '^LR_Y1_CLICKHOUSE_URL=http://clickhouse.test:8123$' <<<"$url_output"
grep -q '^LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_test_fixture$' <<<"$url_output"
grep -q '^LR_Y1_RUN_MAP={"hgsvc_hprc":{"chr1":"run-1"}}$' <<<"$url_output"
grep -q '^LR_Y1_PRIMARY_MANIFEST_PATH=/tmp/primary-manifests.json$' <<<"$url_output"
grep -q '^LR_Y1_REPRESENTED_LENGTH_RULE_PATH=/tmp/represented-length-receipt.json$' <<<"$url_output"
grep -q '^LR_Y1_ANCILLARY_ROUTES={"coverage":{"hgsvc_hprc":{"database":"gnomad_lr_y1_cov","run_id":"cov-1","receipt_path":"/tmp/cov-receipt.json"}}}$' <<<"$url_output"

if LR_DEV_DRY_RUN=1 LR_Y1_ENABLED=true env -u LR_Y1_CLICKHOUSE_URL \
    "$ROOT_DIR/start_lr_dev.sh" >/dev/null 2>&1; then
    echo "Y1 mode without an explicit URL was accepted" >&2
    exit 1
fi

if LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" --y1-clickhouse-port invalid >/dev/null 2>&1; then
    echo "invalid port was accepted" >&2
    exit 1
fi

if LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" \
    --y1-clickhouse-vm gnomad-lr-y1-full-genome-clickhouse >/dev/null 2>&1; then
    echo "explicit GCP instance without --gcp-clickhouse was accepted" >&2
    exit 1
fi

echo "start_lr_dev.sh Y1 configuration test passed"
