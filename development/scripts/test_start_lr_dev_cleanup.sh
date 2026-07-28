#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/lr-dev-cleanup.XXXXXX")"
MOCK_BIN="$TMP_DIR/bin"
STATE_DIR="$TMP_DIR/state"
mkdir -p "$MOCK_BIN" "$STATE_DIR"
RUN_PID=
PREEXISTING_PID=

cleanup() {
    [[ -z "$RUN_PID" ]] || kill -KILL "$RUN_PID" 2>/dev/null || true
    [[ -z "$PREEXISTING_PID" ]] || kill "$PREEXISTING_PID" 2>/dev/null || true
    [[ -z "$PREEXISTING_PID" ]] || wait "$PREEXISTING_PID" 2>/dev/null || true
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

cat >"$MOCK_BIN/docker" <<'EOF'
#!/usr/bin/env bash
case "${1:-}" in
    info) exit 0 ;;
    ps) printf 'redis\n'; exit 0 ;;
    *) echo "unexpected docker write: $*" >&2; exit 90 ;;
esac
EOF

cat >"$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
case "$*" in
    *127.0.0.1:8125/ping*) test -e "$LR_TEST_STATE/tunnel-8125-ready" ;;
    *127.0.0.1:8126/ping*) test -e "$LR_TEST_STATE/tunnel-8126-ready" ;;
    *127.0.0.1:8127/ping*) test -e "$LR_TEST_STATE/tunnel-8127-ready" ;;
    *127.0.0.1:8126/*EXISTS*|*127.0.0.1:8127/*EXISTS*) printf '1' ;;
    *127.0.0.1:9200/*) test -e "$LR_TEST_STATE/es-ready" ;;
    *127.0.0.1:8010/health/ready*) test -e "$LR_TEST_STATE/api-ready" ;;
    *) exit 1 ;;
esac
EOF

cat >"$MOCK_BIN/gcloud" <<'EOF'
#!/usr/bin/env bash
case "$*" in
    'compute ssh '*)
        port="$(printf '%s\n' "$*" | sed -n 's/.*-L \([0-9][0-9]*\):localhost:8123.*/\1/p')"
        name="tunnel-$port"
        ;;
    'run services proxy '*) name=es ;;
    *) echo "unexpected gcloud command: $*" >&2; exit 91 ;;
esac
python3 - "$LR_TEST_STATE/$name-listener.port" <<'PY' &
import pathlib
import socket
import sys
server = socket.socket()
server.bind(("127.0.0.1", 0))
server.listen()
pathlib.Path(sys.argv[1]).write_text(str(server.getsockname()[1]))
while True:
    connection, _ = server.accept()
    connection.close()
PY
child=$!
printf '%s\n' "$child" >"$LR_TEST_STATE/$name-child.pid"
while [[ ! -e "$LR_TEST_STATE/$name-listener.port" ]]; do sleep 0.01; done
touch "$LR_TEST_STATE/$name-ready"
wait "$child"
EOF

cat >"$MOCK_BIN/pnpm" <<'EOF'
#!/usr/bin/env bash
case "$*" in
    'ts-node ./build/buildHelp.ts') exit 0 ;;
    'ts-node ./src/app.ts') name=api ;;
    'webpack serve') name=browser ;;
    *) echo "unexpected pnpm command: $*" >&2; exit 92 ;;
esac
touch "$LR_TEST_STATE/$name-ready"
sleep 300 &
child=$!
printf '%s\n' "$child" >"$LR_TEST_STATE/$name-child.pid"
wait "$child"
EOF
chmod +x "$MOCK_BIN"/*

# A process not launched by start_lr_dev.sh must survive its cleanup.
sleep 300 &
PREEXISTING_PID=$!

PATH="$MOCK_BIN:$PATH" LR_TEST_STATE="$STATE_DIR" \
    "$ROOT_DIR/start_lr_dev.sh" --gcp-clickhouse >"$TMP_DIR/output.log" 2>&1 &
RUN_PID=$!

for _ in $(seq 1 200); do
    [[ -e "$STATE_DIR/browser-ready" ]] && break
    kill -0 "$RUN_PID" 2>/dev/null || {
        cat "$TMP_DIR/output.log" >&2
        echo "start_lr_dev.sh exited before the browser started" >&2
        exit 1
    }
    sleep 0.05
done
[[ -e "$STATE_DIR/browser-ready" ]] || {
    cat "$TMP_DIR/output.log" >&2
    echo "timed out waiting for mocked browser" >&2
    exit 1
}

kill -TERM "$RUN_PID"
status=0
wait "$RUN_PID" || status=$?
RUN_PID=
[[ "$status" -eq 143 ]] || {
    cat "$TMP_DIR/output.log" >&2
    echo "expected signal exit 143, got $status" >&2
    exit 1
}

kill -0 "$PREEXISTING_PID" 2>/dev/null || {
    echo "cleanup touched a pre-existing process" >&2
    exit 1
}

for name in tunnel-8125 tunnel-8126 tunnel-8127 es api browser; do
    pid="$(cat "$STATE_DIR/$name-child.pid")"
    if ps -o stat= -p "$pid" 2>/dev/null | grep -qv '^Z'; then
        echo "$name descendant $pid survived cleanup" >&2
        exit 1
    fi
done

for name in tunnel-8125 tunnel-8126 tunnel-8127 es; do
    port="$(cat "$STATE_DIR/$name-listener.port")"
    if python3 - "$port" <<'PY'
import socket
import sys
try:
    socket.create_connection(("127.0.0.1", int(sys.argv[1])), timeout=0.1)
except OSError:
    raise SystemExit(1)
PY
    then
        echo "$name child listener on $port survived cleanup" >&2
        exit 1
    fi
done

grep -q 'Shutting down' "$TMP_DIR/output.log"
grep -q 'pre-existing tunnels were left running' "$TMP_DIR/output.log"
echo "start_lr_dev.sh cleanup test passed"
