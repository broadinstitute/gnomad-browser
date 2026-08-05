#!/usr/bin/env bash
# Exercise deploy.sh through build_one with local git/gcloud fakes only.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
mkdir -p "$TMP_DIR/bin"

FAKE_SHA="0123456789abcdef0123456789abcdef01234567"
FAKE_DIGEST="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
FAKE_BUILD_ID="11111111-2222-4333-8444-555555555555"
GCLOUD_LOG="$TMP_DIR/gcloud.log"
export FAKE_SHA FAKE_DIGEST FAKE_BUILD_ID GCLOUD_LOG

cat >"$TMP_DIR/bin/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  "status --porcelain") exit 0 ;;
  "rev-parse HEAD") printf '%s\n' "$FAKE_SHA" ;;
  *) printf 'unexpected git invocation: %s\n' "$*" >&2; exit 97 ;;
esac
EOF

cat >"$TMP_DIR/bin/gcloud" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%q ' "$@" >>"$GCLOUD_LOG"
printf '\n' >>"$GCLOUD_LOG"
case "$1 $2 $3 $4" in
  "artifacts docker images describe")
    if [[ " $* " == *" --format=value(image_summary.digest) "* ]]; then
      printf '%s\n' "$FAKE_DIGEST"
      exit 0
    fi
    exit 1
    ;;
  "builds submit "*)
    # gcloud may include extra tabular stdout around the formatted build ID.
    # This exact shape used to corrupt the tab-separated result serializer.
    printf 'metadata\tfrom\tgcloud\n%s\n' "$FAKE_BUILD_ID"
    ;;
  *)
    printf 'unexpected gcloud invocation: %s\n' "$*" >&2
    exit 98
    ;;
esac
EOF
chmod +x "$TMP_DIR/bin/git" "$TMP_DIR/bin/gcloud"

set +e
PATH="$TMP_DIR/bin:$PATH" "$SCRIPT_DIR/deploy.sh" --api-only \
  >"$TMP_DIR/refusal.out" 2>&1
refusal_status=$?
set -e
[[ $refusal_status -eq 2 ]] || {
  printf 'expected unconfirmed invocation to exit 2, got %s\n' "$refusal_status" >&2
  exit 1
}
grep -Fq 'Refusing remote build/push without --confirm-build-push' "$TMP_DIR/refusal.out"
[[ ! -e "$GCLOUD_LOG" ]] || {
  echo 'unconfirmed invocation reached gcloud' >&2
  exit 1
}

PATH="$TMP_DIR/bin:$PATH" "$SCRIPT_DIR/deploy.sh" \
  --confirm-build-push \
  --receipt "$TMP_DIR/receipt.json" \
  >"$TMP_DIR/dry-run.out"

python3 - "$TMP_DIR/receipt.json" "$FAKE_SHA" "$FAKE_DIGEST" "$FAKE_BUILD_ID" <<'PY'
import json
import pathlib
import sys

receipt = json.loads(pathlib.Path(sys.argv[1]).read_text())
assert receipt["source_sha"] == sys.argv[2]
assert set(receipt["images"]) == {"api", "browser"}
assert receipt["cloud_run_tag"].startswith("fg-01234567-")
assert len(receipt["cloud_run_tag"]) + len("gnomad-lr-browser") <= 46
for component in ("api", "browser"):
    assert receipt["images"][component] == {
        "image": f"us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-{component}",
        "tag": receipt["tag"],
        "digest": sys.argv[3],
        "build_id": sys.argv[4],
    }
PY

grep -Fq 'artifacts docker images describe us-docker.pkg.dev/gnomadev/gnomad/gnomad-lr-api:' "$GCLOUD_LOG"
grep -Fq 'builds submit --project=gnomadev' "$GCLOUD_LOG"
grep -Fq '_DOCKERFILE=deploy/dockerfiles/browser/api.dockerfile' "$GCLOUD_LOG"
grep -Fq '_DOCKERFILE=deploy/dockerfiles/browser/browser.dockerfile' "$GCLOUD_LOG"
[[ $(wc -l <"$GCLOUD_LOG") -eq 6 ]] || {
  echo 'offline build path made an unexpected number of gcloud calls' >&2
  exit 1
}

set +e
PATH="$TMP_DIR/bin:$PATH" "$SCRIPT_DIR/deploy-no-traffic.sh" \
  --api-digest "$FAKE_DIGEST" \
  --browser-digest "$FAKE_DIGEST" \
  --tag "fullgenome-${FAKE_SHA:0:12}-20260805t192603z" \
  --evidence-dir "$TMP_DIR/no-traffic" \
  --confirm-no-traffic-deploy \
  >"$TMP_DIR/long-tag.out" 2>&1
long_tag_status=$?
set -e
[[ $long_tag_status -eq 2 ]]
grep -Fq 'Cloud Run tag is too long for gnomad-lr-' "$TMP_DIR/long-tag.out"
[[ $(wc -l <"$GCLOUD_LOG") -eq 6 ]] || {
  echo 'invalid Cloud Run tag reached gcloud' >&2
  exit 1
}

echo 'verified confirmation refusal, robust receipt serialization, and Cloud Run tag length offline'
