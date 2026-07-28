#!/usr/bin/env bash
# API and browser environment changes are intentionally isolated in separate subshells.
# shellcheck disable=SC2030,SC2031
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { printf '%b[lr-dev]%b %s\n' "$GREEN" "$NC" "$*"; }
warn() { printf '%b[lr-dev]%b %s\n' "$YELLOW" "$NC" "$*" >&2; }
err()  { printf '%b[lr-dev]%b %s\n' "$RED" "$NC" "$*" >&2; }
die()  { err "$*"; exit 1; }

USE_GCP_CH=false
for arg in "$@"; do
    case "$arg" in
        --gcp-clickhouse) USE_GCP_CH=true ;;
        --help|-h)
            cat <<'EOF'
Usage: ./start_lr_dev.sh [--gcp-clickhouse]

  --gcp-clickhouse   Start the chr22 Y1 mixed-provenance prototype. The API
                     keeps legacy ClickHouse on a separate tunnel for existing
                     non-prototype paths.

GCP mode ports (all may be overridden):
  GCP_CH_PORT=8125                 legacy gnomad-lr-data-vm
  LR_Y1_GCP_CH_PORT=8126           accepted Y1 primary and metadata
  LR_Y1_ANCILLARY_GCP_CH_PORT=8127 isolated prototype ancillary data

Prototype configuration:
  LR_Y1_CLICKHOUSE_DATABASE
  LR_Y1_HGSVC_RUN_ID
  LR_Y1_AOU_RUN_ID
  LR_Y1_HGSVC_METADATA_RUN_ID
  LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE
  LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES
  LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST

Defaults are the accepted chr22 r2 rehearsal identities documented by the API.
Set LR_DEV_DRY_RUN=1 to validate and print the resolved configuration without
starting Docker, tunnels, the API, or the browser.
EOF
            exit 0
            ;;
        *) die "Unknown argument: $arg (use --help)" ;;
    esac
done

GCP_PROJECT="${GCP_PROJECT:-gnomadev}"
GCP_ZONE="${GCP_ZONE:-us-east1-c}"
LEGACY_GCP_CH_VM="${LEGACY_GCP_CH_VM:-gnomad-lr-data-vm}"
Y1_GCP_CH_VM="${LR_Y1_GCP_CH_VM:-gnomad-lr-y1-clickhouse}"
GCP_CH_LOCAL_PORT="${GCP_CH_PORT:-8125}"
Y1_GCP_CH_LOCAL_PORT="${LR_Y1_GCP_CH_PORT:-8126}"
ANCILLARY_GCP_CH_LOCAL_PORT="${LR_Y1_ANCILLARY_GCP_CH_PORT:-8127}"

Y1_DATABASE="${LR_Y1_CLICKHOUSE_DATABASE:-gnomad_lr_y1_serving_chr22_r2_rehearsal}"
Y1_HGSVC_RUN_ID="${LR_Y1_HGSVC_RUN_ID:-y1-full-chr22-hgsvc-hprc-20260728-r2-retry1}"
Y1_AOU_RUN_ID="${LR_Y1_AOU_RUN_ID:-y1-full-chr22-aou-20260728-r2}"
Y1_METADATA_RUN_ID="${LR_Y1_HGSVC_METADATA_RUN_ID:-y1-metadata-full-chr22-20260728-r2-retry1}"
ANCILLARY_DATABASE="${LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE:-gnomad_lr_y1_prototype_ancillary_chr22}"
ANCILLARY_MODALITIES="${LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES-coverage,str_histogram,methylation}"

[[ "$Y1_DATABASE" =~ ^gnomad_lr_y1_[a-z0-9_]+$ ]] ||
    die "Unsafe LR_Y1_CLICKHOUSE_DATABASE: $Y1_DATABASE"
[[ "$ANCILLARY_DATABASE" =~ ^gnomad_lr_(y1_)?(legacy_)?prototype_[a-z0-9_]+$ ]] ||
    die "Unsafe LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE: $ANCILLARY_DATABASE"

IFS=',' read -r -a modality_list <<< "$ANCILLARY_MODALITIES"
for modality in "${modality_list[@]}"; do
    case "$modality" in
        coverage|methylation|str_histogram|'') ;;
        *) die "Unsupported prototype ancillary modality '$modality'; expected coverage, methylation, or str_histogram" ;;
    esac
done

METHYLATION_ALLOWLIST="${LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST:-}"
DEFAULT_METHYLATION_ALLOWLIST="$ROOT_DIR/graphql-api/data/lr-y1-prototype-methylation-available-samples.txt"
if [[ ",$ANCILLARY_MODALITIES," == *,methylation,* ]]; then
    if [[ -z "$METHYLATION_ALLOWLIST" && -f "$DEFAULT_METHYLATION_ALLOWLIST" ]]; then
        METHYLATION_ALLOWLIST="$DEFAULT_METHYLATION_ALLOWLIST"
    fi
    [[ -n "$METHYLATION_ALLOWLIST" ]] || die "methylation is configured, but no validated allowlist was found; set LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST or choose other modalities"
    [[ -r "$METHYLATION_ALLOWLIST" ]] || die "Methylation allowlist is not readable: $METHYLATION_ALLOWLIST"
    allowlist_count="$(awk 'NF { seen[$0]=1 } END { print length(seen) }' "$METHYLATION_ALLOWLIST")"
    [[ "$allowlist_count" == 210 ]] || die "Methylation allowlist must contain exactly 210 unique available sample IDs (found $allowlist_count): $METHYLATION_ALLOWLIST"
fi

if [[ "$USE_GCP_CH" == true ]]; then
    [[ "$GCP_CH_LOCAL_PORT" != "$Y1_GCP_CH_LOCAL_PORT" &&
       "$GCP_CH_LOCAL_PORT" != "$ANCILLARY_GCP_CH_LOCAL_PORT" &&
       "$Y1_GCP_CH_LOCAL_PORT" != "$ANCILLARY_GCP_CH_LOCAL_PORT" ]] ||
        die "Legacy, Y1 primary, and ancillary tunnel ports must be distinct"
fi

if [[ "${LR_DEV_DRY_RUN:-0}" == 1 ]]; then
    log "Dry run: configuration is statically valid."
    printf 'mode=%s\n' "$([[ "$USE_GCP_CH" == true ]] && echo chr22-mixed || echo local-legacy)"
    if [[ "$USE_GCP_CH" == true ]]; then
        printf 'CLICKHOUSE_URL=http://127.0.0.1:%s\n' "$GCP_CH_LOCAL_PORT"
        printf 'LR_Y1_CLICKHOUSE_URL=http://127.0.0.1:%s\n' "$Y1_GCP_CH_LOCAL_PORT"
        printf 'LR_Y1_CLICKHOUSE_DATABASE=%s\n' "$Y1_DATABASE"
        printf 'LR_Y1_HGSVC_RUN_ID=%s\n' "$Y1_HGSVC_RUN_ID"
        printf 'LR_Y1_AOU_RUN_ID=%s\n' "$Y1_AOU_RUN_ID"
        printf 'LR_Y1_HGSVC_METADATA_RUN_ID=%s\n' "$Y1_METADATA_RUN_ID"
        printf 'LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_URL=http://127.0.0.1:%s\n' "$ANCILLARY_GCP_CH_LOCAL_PORT"
        printf 'LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE=%s\n' "$ANCILLARY_DATABASE"
        printf 'LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES=%s\n' "$ANCILLARY_MODALITIES"
        if [[ -n "$METHYLATION_ALLOWLIST" ]]; then
            printf 'LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST=%s\n' "$METHYLATION_ALLOWLIST"
        fi
    fi
    exit 0
fi

# Every long-lived process started by this invocation gets its own session. This
# lets cleanup address the complete process group (including gcloud/ssh, pnpm,
# and pipeline descendants) without signalling any pre-existing listener.
OWNED_PIDS=()
CLEANUP_DONE=false
LAST_OWNED_PID=

start_owned() {
    local pid_var="$1" pgid i
    shift

    python3 -c 'import os, sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])' "$@" &
    LAST_OWNED_PID=$!
    OWNED_PIDS+=("$LAST_OWNED_PID")
    printf -v "$pid_var" '%s' "$LAST_OWNED_PID"

    # Do not proceed until the launcher is demonstrably the leader of its
    # private process group. Cleanup can then safely signal its negative PGID.
    for i in $(seq 1 100); do
        pgid="$(ps -o pgid= -p "$LAST_OWNED_PID" 2>/dev/null | tr -d ' ')"
        [[ "$pgid" == "$LAST_OWNED_PID" ]] && return 0
        kill -0 "$LAST_OWNED_PID" 2>/dev/null || {
            wait "$LAST_OWNED_PID" 2>/dev/null || true
            return 1
        }
        sleep 0.01
    done
    err "Failed to isolate background process"
    return 1
}

process_group_alive() {
    # Ignore zombies: the session leader remains waitable until reaped and must
    # not force every normal shutdown through the timeout/KILL path.
    ps -eo pgid=,stat= 2>/dev/null | awk -v pgid="$1" '
        $1 == pgid && $2 !~ /^Z/ { found = 1 }
        END { exit !found }
    '
}

terminate_owned() {
    local pid="$1" pgid i

    pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
    if [[ "$pgid" == "$pid" ]] || process_group_alive "$pid"; then
        kill -TERM -- "-$pid" 2>/dev/null || true
    elif kill -0 "$pid" 2>/dev/null; then
        # Cleanup interrupted start_owned before its setsid handshake. Killing
        # only the launcher cannot affect this script's or any existing group.
        kill -TERM "$pid" 2>/dev/null || true
    fi
    for i in $(seq 1 50); do
        process_group_alive "$pid" || break
        sleep 0.1
    done
    process_group_alive "$pid" && kill -KILL -- "-$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
}

cleanup() {
    local status=$? i
    $CLEANUP_DONE && return "$status"
    CLEANUP_DONE=true
    trap - EXIT INT TERM

    if ((${#OWNED_PIDS[@]})); then
        log "Shutting down processes started by lr-dev..."
        for ((i=${#OWNED_PIDS[@]}-1; i>=0; i--)); do
            terminate_owned "${OWNED_PIDS[$i]}"
        done
    fi
    log "Done. Existing containers and pre-existing tunnels were left running."
    return "$status"
}

handle_signal() {
    local status="$1"
    trap - INT TERM
    exit "$status"
}

trap cleanup EXIT
trap 'handle_signal 130' INT
trap 'handle_signal 143' TERM

need_command() { command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }
for command_name in docker curl pnpm python3; do need_command "$command_name"; done
if [[ "$USE_GCP_CH" == true ]]; then need_command gcloud; fi

wait_for_http() {
    local label="$1" url="$2" pid="${3:-}" attempts="${4:-30}"
    local i
    for ((i = 1; i <= attempts; i++)); do
        if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then return 0; fi
        if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
            die "$label process exited before becoming ready"
        fi
        sleep 1
    done
    die "$label did not become ready at $url after ${attempts}s"
}

start_tunnel() {
    local label="$1" vm="$2" port="$3" database="${4:-}"
    local url="http://127.0.0.1:${port}"
    if curl -fsS --max-time 2 "$url/ping" >/dev/null 2>&1; then
        log "$label tunnel already active on port $port."
    else
        log "Opening $label IAP tunnel ($vm -> localhost:$port)..."
        local pid
        start_owned pid gcloud compute ssh "$vm" \
            --project="$GCP_PROJECT" --zone="$GCP_ZONE" --tunnel-through-iap -- \
            -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
            -L "${port}:localhost:8123" -N
        wait_for_http "$label ClickHouse tunnel" "$url/ping" "$pid" 45
    fi
    if [[ -n "$database" ]]; then
        local exists
        exists="$(curl -fsS --max-time 10 "$url/" --data-binary "EXISTS DATABASE ${database} FORMAT TabSeparated")" ||
            die "$label tunnel is reachable, but database readiness check failed for $database"
        [[ "$exists" == 1 ]] || die "$label database does not exist: $database"
    fi
    log "$label ClickHouse is ready at $url${database:+ (database $database)}."
}

# 1. Docker runtime
if ! docker info >/dev/null 2>&1; then
    need_command colima
    if colima list 2>/dev/null | grep -q 'Running'; then
        warn "Colima is running but Docker is unresponsive; restarting Colima."
        colima stop --force
    fi
    log "Starting Colima..."
    colima start
    for _ in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
    docker info >/dev/null 2>&1 || die "Docker failed to become ready"
else
    log "Docker already running."
fi

# 2. ClickHouse endpoints
if [[ "$USE_GCP_CH" == true ]]; then
    start_tunnel "legacy" "$LEGACY_GCP_CH_VM" "$GCP_CH_LOCAL_PORT"
    start_tunnel "Y1 primary/metadata" "$Y1_GCP_CH_VM" "$Y1_GCP_CH_LOCAL_PORT" "$Y1_DATABASE"
    start_tunnel "prototype ancillary" "$Y1_GCP_CH_VM" "$ANCILLARY_GCP_CH_LOCAL_PORT" "$ANCILLARY_DATABASE"
    CH_URL="http://127.0.0.1:${GCP_CH_LOCAL_PORT}"
    Y1_CH_URL="http://127.0.0.1:${Y1_GCP_CH_LOCAL_PORT}"
    ANCILLARY_CH_URL="http://127.0.0.1:${ANCILLARY_GCP_CH_LOCAL_PORT}"
else
    CH_URL="http://127.0.0.1:8123"
    if curl -fsS "$CH_URL/ping" >/dev/null 2>&1; then
        log "Local ClickHouse already running."
    elif docker ps -a --format '{{.Names}}' | grep -q '^clickhouse$'; then
        log "Starting existing ClickHouse container..."
        docker start clickhouse >/dev/null
        wait_for_http "local ClickHouse" "$CH_URL/ping" '' 30
    else
        log "Creating local ClickHouse container..."
        docker run -d --name clickhouse -p 8123:8123 -p 9000:9000 \
            -v clickhouse_data:/var/lib/clickhouse clickhouse/clickhouse-server >/dev/null
        wait_for_http "local ClickHouse" "$CH_URL/ping" '' 30
    fi
fi

# 3. Elasticsearch
if curl -fsS http://127.0.0.1:9200/ >/dev/null 2>&1; then
    log "ES proxy already running on localhost:9200."
else
    need_command gcloud
    log "Starting local ES proxy..."
    start_owned ES_PROXY_PID gcloud run services proxy gnomad-es-readonly-proxy \
        --project=exac-gnomad --region=us-east1 --port=9200
    wait_for_http "ES proxy" "http://127.0.0.1:9200/" "$ES_PROXY_PID" 45
fi

# 4. Redis
if docker ps --format '{{.Names}}' | grep -q '^redis$'; then
    log "Redis already running."
elif docker ps -a --format '{{.Names}}' | grep -q '^redis$'; then
    log "Starting existing Redis container..."
    docker start redis >/dev/null
else
    log "Creating Redis container..."
    docker run -d --name redis -p 6379:6379 redis:alpine >/dev/null
fi

# 5. GraphQL API
log "Starting GraphQL API on :8010..."
API_ENV=(
    NODE_ENV=development
    PORT=8010
    CLICKHOUSE_URL="${CLICKHOUSE_URL:-$CH_URL}"
    ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://127.0.0.1:9200}"
    CACHE_REDIS_URL=redis://localhost:6379/1
    RATE_LIMITER_REDIS_URL=redis://localhost:6379/2
)
if [[ "$USE_GCP_CH" == true ]]; then
    API_ENV+=(
        LR_Y1_ENABLED=true
        LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED=true
        LR_Y1_CLICKHOUSE_URL="${LR_Y1_CLICKHOUSE_URL:-$Y1_CH_URL}"
        LR_Y1_CLICKHOUSE_DATABASE="$Y1_DATABASE"
        LR_Y1_HGSVC_RUN_ID="$Y1_HGSVC_RUN_ID"
        LR_Y1_AOU_RUN_ID="$Y1_AOU_RUN_ID"
        LR_Y1_HGSVC_METADATA_RUN_ID="$Y1_METADATA_RUN_ID"
        LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_URL="${LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_URL:-$ANCILLARY_CH_URL}"
        LR_Y1_PROTOTYPE_ANCILLARY_CLICKHOUSE_DATABASE="$ANCILLARY_DATABASE"
        LR_Y1_PROTOTYPE_ANCILLARY_MODALITIES="$ANCILLARY_MODALITIES"
    )
    if [[ -n "$METHYLATION_ALLOWLIST" ]]; then
        API_ENV+=(LR_Y1_PROTOTYPE_METHYLATION_SAMPLE_ALLOWLIST="$METHYLATION_ALLOWLIST")
    fi
fi
# $1 is expanded by the child bash.
# shellcheck disable=SC2016
start_owned API_PID env "${API_ENV[@]}" \
    bash -c 'cd "$1/graphql-api"; pnpm ts-node ./src/app.ts 2>&1 | sed '\''s/^/[api] /'\''' _ "$ROOT_DIR"
wait_for_http "GraphQL API" "http://127.0.0.1:8010/health/ready" "$API_PID" 45
log "GraphQL API is ready."

# 6. Browser frontend
log "Starting browser on http://localhost:8008"
BROWSER_ENV=(
    NODE_ENV=development
    GNOMAD_API_URL=http://127.0.0.1:8010/api
    READS_API_URL=https://gnomad.broadinstitute.org/reads
)
if [[ "$USE_GCP_CH" == true ]]; then
    BROWSER_ENV+=(LR_Y1_ENABLED=true LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED=true)
fi
# $1 is expanded by the child bash.
# shellcheck disable=SC2016
start_owned BROWSER_PID env "${BROWSER_ENV[@]}" \
    bash -c 'cd "$1/browser"; pnpm ts-node ./build/buildHelp.ts; pnpm webpack serve 2>&1 | sed '\''s/^/[browser] /'\''' _ "$ROOT_DIR"
wait "$BROWSER_PID"
