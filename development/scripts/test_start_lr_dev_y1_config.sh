#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

port_output="$(LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" --y1-clickhouse-port 9134)"
grep -q '^mode=y1$' <<<"$port_output"
grep -q '^LR_Y1_ENABLED=true$' <<<"$port_output"
grep -q '^LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:9134$' <<<"$port_output"
grep -q '^LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_scratch_v5_current$' <<<"$port_output"
if grep -Eq 'CHR22_MIXED|RUN_ID|published|candidate|accepted.*r2' <<<"$port_output"; then
    echo "obsolete Y1 mode or pinned provenance leaked into launcher output" >&2
    exit 1
fi

gcp_only_output="$(LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" --gcp-clickhouse)"
grep -q '^mode=legacy$' <<<"$gcp_only_output"
if grep -q '^LR_Y1_ENABLED=' <<<"$gcp_only_output"; then
    echo "--gcp-clickhouse incorrectly selected Y1 provenance mode" >&2
    exit 1
fi

url_output="$(
    LR_DEV_DRY_RUN=1 \
    LR_Y1_CLICKHOUSE_URL=http://clickhouse.test:8123 \
    LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_test_fixture \
    "$ROOT_DIR/start_lr_dev.sh"
)"
grep -q '^LR_Y1_CLICKHOUSE_URL=http://clickhouse.test:8123$' <<<"$url_output"
grep -q '^LR_Y1_CLICKHOUSE_DATABASE=gnomad_lr_y1_test_fixture$' <<<"$url_output"

if LR_DEV_DRY_RUN=1 "$ROOT_DIR/start_lr_dev.sh" --y1-clickhouse-port invalid >/dev/null 2>&1; then
    echo "invalid port was accepted" >&2
    exit 1
fi

echo "start_lr_dev.sh Y1 configuration test passed"
