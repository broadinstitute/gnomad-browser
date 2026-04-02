#!/bin/bash
set -eu

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[lr-dev]${NC} $*"; }
warn() { echo -e "${YELLOW}[lr-dev]${NC} $*"; }
err()  { echo -e "${RED}[lr-dev]${NC} $*"; }

cleanup() {
    log "Shutting down..."
    kill $(jobs -p) 2>/dev/null || true
    wait 2>/dev/null || true
    log "Done."
}
trap cleanup EXIT INT TERM

# --- 1. Colima / Docker ---
if ! docker info &>/dev/null; then
    log "Starting Colima..."
    colima start
    # Wait for docker to be ready
    for i in $(seq 1 30); do
        docker info &>/dev/null && break
        sleep 1
    done
    docker info &>/dev/null || { err "Docker failed to start"; exit 1; }
    log "Docker is ready."
else
    log "Docker already running."
fi

# --- 2. ClickHouse ---
if curl -sf http://localhost:8123/ping &>/dev/null; then
    log "ClickHouse already running."
else
    if docker ps -a --format '{{.Names}}' | grep -q '^clickhouse$'; then
        log "Starting existing ClickHouse container..."
        docker start clickhouse
    else
        log "Creating new ClickHouse container..."
        docker run -d --name clickhouse \
            -p 8123:8123 -p 9000:9000 \
            -v clickhouse_data:/var/lib/clickhouse \
            clickhouse/clickhouse-server
    fi
    # Wait for ClickHouse to be ready
    log "Waiting for ClickHouse..."
    for i in $(seq 1 30); do
        curl -sf http://localhost:8123/ping &>/dev/null && break
        sleep 1
    done
    curl -sf http://localhost:8123/ping &>/dev/null || { err "ClickHouse failed to start"; exit 1; }
    log "ClickHouse is ready."
fi

# --- 3. Elasticsearch ---
if curl -sf http://127.0.0.1:9200/ &>/dev/null; then
    log "Elasticsearch already running."
else
    if docker ps -a --format '{{.Names}}' | grep -q '^gnomad-es$'; then
        log "Starting existing Elasticsearch container..."
        docker start gnomad-es
    else
        log "Creating Elasticsearch container..."
        docker run -d --name gnomad-es \
            -p 9200:9200 \
            -e "discovery.type=single-node" \
            -v gnomad_es_data:/usr/share/elasticsearch/data \
            elasticsearch:7.17.27
    fi
    log "Waiting for Elasticsearch..."
    for i in $(seq 1 30); do
        curl -sf http://127.0.0.1:9200/ &>/dev/null && break
        sleep 1
    done
    curl -sf http://127.0.0.1:9200/ &>/dev/null || { err "Elasticsearch failed to start"; exit 1; }
    log "Elasticsearch is ready."
fi

# --- 4. Redis ---
if docker ps --format '{{.Names}}' | grep -q '^redis$'; then
    log "Redis already running."
else
    if docker ps -a --format '{{.Names}}' | grep -q '^redis$'; then
        log "Starting existing Redis container..."
        docker start redis
    else
        log "Creating Redis container..."
        docker run -d --name redis -p 6379:6379 redis:alpine
    fi
    log "Redis is ready."
fi

# --- 5. GraphQL API (background) ---
log "Starting GraphQL API on :8010..."
(
    cd "$ROOT_DIR/graphql-api"
    export NODE_ENV=development
    export PORT=8010
    export ELASTICSEARCH_URL="${ELASTICSEARCH_URL:-http://127.0.0.1:9200}"
    export CACHE_REDIS_URL="redis://localhost:6379/1"
    export RATE_LIMITER_REDIS_URL="redis://localhost:6379/2"
    pnpm ts-node ./src/app.ts 2>&1 | sed 's/^/[api] /'
) &
API_PID=$!

# Wait for API to be ready
log "Waiting for GraphQL API..."
for i in $(seq 1 30); do
    curl -sf http://localhost:8010/health/ready &>/dev/null && break
    # Also check if process died
    kill -0 $API_PID 2>/dev/null || { err "API process died"; wait $API_PID; exit 1; }
    sleep 1
done
log "GraphQL API is ready."

# --- 6. Browser frontend (foreground) ---
log "Starting browser on webpack-dev-server..."
log "Access at http://localhost:8008"
(
    cd "$ROOT_DIR/browser"
    export NODE_ENV=development
    export GNOMAD_API_URL="http://127.0.0.1:8010/api"
    export READS_API_URL="https://gnomad.broadinstitute.org/reads"
    pnpm ts-node ./build/buildHelp.ts
    pnpm webpack serve 2>&1 | sed 's/^/[browser] /'
)
