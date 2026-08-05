#!/usr/bin/env bash
# Build immutable full-genome API/browser images. This script never runs Terraform
# and never deploys Cloud Run; use deploy-no-traffic.sh with resolved digests later.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_ID="gnomadev"
REGISTRY="us-docker.pkg.dev/${PROJECT_ID}/gnomad"
CLOUDBUILD_CONFIG="deploy/terraform/lr-viewer/cloudbuild.yaml"
ROUTING_MANIFEST="graphql-api/config/full-genome-routing-artifact-manifest.json"

BUILD_API=true
BUILD_BROWSER=true
CONFIRMED=false
RECEIPT_PATH=""

usage() {
  cat <<'USAGE'
Usage: deploy.sh --confirm-build-push [--api-only|--browser-only] [--receipt PATH]

Builds from a clean committed tree, pushes a unique fullgenome-<sha>-<UTC> tag,
and records the resolved digest(s). It does not use :latest, run Terraform, deploy
Cloud Run, or change traffic. Build/push requires explicit --confirm-build-push.
USAGE
}

while (($#)); do
  case "$1" in
    --confirm-build-push) CONFIRMED=true ;;
    --api-only) BUILD_BROWSER=false ;;
    --browser-only) BUILD_API=false ;;
    --receipt)
      shift
      [[ $# -gt 0 ]] || { echo "--receipt requires a path" >&2; exit 2; }
      RECEIPT_PATH="$1"
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

[[ "$CONFIRMED" == true ]] || { echo "Refusing remote build/push without --confirm-build-push" >&2; exit 2; }
command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

cd "$REPO_ROOT"
[[ -z "$(git status --porcelain)" ]] || { echo "Refusing to build a dirty worktree" >&2; exit 1; }
SOURCE_SHA="$(git rev-parse HEAD)"
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Unable to resolve a full git SHA" >&2; exit 1; }
CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
TAG="fullgenome-${SOURCE_SHA:0:12}-$(date -u +%Y%m%dt%H%M%Sz)"
ROUTING_MANIFEST_SHA256="$(python3 - "$ROUTING_MANIFEST" <<'PY'
import hashlib, pathlib, sys
print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)"

python3 "$SCRIPT_DIR/verify-release-config.py"

build_one() {
  local component="$1" dockerfile="$2"
  local image="${REGISTRY}/gnomad-lr-${component}"
  local build_id digest
  if gcloud artifacts docker images describe "${image}:${TAG}" \
    --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "Refusing to overwrite existing image tag: ${image}:${TAG}" >&2
    exit 1
  fi
  echo ">>> Building ${image}:${TAG} from ${SOURCE_SHA}"
  build_id="$(gcloud builds submit \
    --project="$PROJECT_ID" \
    --config="$CLOUDBUILD_CONFIG" \
    --substitutions="_DOCKERFILE=${dockerfile},_IMAGE=${image},_TAG=${TAG},_SOURCE_SHA=${SOURCE_SHA},_CREATED=${CREATED},_ROUTING_MANIFEST_SHA256=${ROUTING_MANIFEST_SHA256},_LR_Y1_ENABLED=true" \
    --timeout=15m \
    --format='value(id)' \
    .)"
  digest="$(gcloud artifacts docker images describe "${image}:${TAG}" \
    --project="$PROJECT_ID" \
    --format='value(image_summary.digest)')"
  [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid resolved digest: $digest" >&2; exit 1; }
  printf '%s\t%s\t%s\t%s\n' "$component" "$image" "$build_id" "$digest" >>"$RESULTS_FILE"
}

RESULTS_FILE="$(mktemp)"
trap 'rm -f "$RESULTS_FILE"' EXIT
$BUILD_API && build_one api deploy/dockerfiles/browser/api.dockerfile
$BUILD_BROWSER && build_one browser deploy/dockerfiles/browser/browser.dockerfile

if [[ -z "$RECEIPT_PATH" ]]; then
  RECEIPT_PATH="/tmp/gnomad-lr-${TAG}-images.json"
fi
python3 - "$RESULTS_FILE" "$RECEIPT_PATH" "$SOURCE_SHA" "$TAG" "$CREATED" "$ROUTING_MANIFEST_SHA256" <<'PY'
import json, pathlib, sys
rows = {}
for line in pathlib.Path(sys.argv[1]).read_text().splitlines():
    component, image, build_id, digest = line.split("\t")
    rows[component] = {"image": image, "tag": sys.argv[4], "digest": digest, "build_id": build_id}
out = {
    "schema_version": 1,
    "source_sha": sys.argv[3],
    "tag": sys.argv[4],
    "created": sys.argv[5],
    "routing_artifact_manifest_sha256": sys.argv[6],
    "images": rows,
}
path = pathlib.Path(sys.argv[2])
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(out, indent=2) + "\n")
print(path)
PY

echo ">>> Immutable image receipt: ${RECEIPT_PATH}"
echo ">>> No Terraform or Cloud Run deployment was performed."
