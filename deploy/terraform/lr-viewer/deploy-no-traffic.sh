#!/usr/bin/env bash
# Stage digest-pinned API/browser revisions with tags and zero traffic.
# This intentionally patches the existing services and never runs Terraform.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="gnomadev"
REGION="us-east1"
REGISTRY="us-docker.pkg.dev/${PROJECT_ID}/gnomad"
API_SERVICE="gnomad-lr-api"
BROWSER_SERVICE="gnomad-lr-browser"
API_ENV_FILE="$SCRIPT_DIR/full-genome-api-env.json"

API_DIGEST=""
BROWSER_DIGEST=""
TAG=""
EVIDENCE_DIR=""
CONFIRMED=false

usage() {
  cat <<'USAGE'
Usage: deploy-no-traffic.sh --api-digest sha256:... --browser-digest sha256:... \
  --tag fullgenome-<12sha>-<UTC> --evidence-dir DIR --confirm-no-traffic-deploy

Queries and archives live service state, patches only image/env on the existing
services, and creates tagged revisions with --no-traffic. The browser is pointed at
the tagged API URL. This script never runs Terraform or changes IAM/traffic.
USAGE
}

while (($#)); do
  case "$1" in
    --api-digest) shift; API_DIGEST="${1:-}" ;;
    --browser-digest) shift; BROWSER_DIGEST="${1:-}" ;;
    --tag) shift; TAG="${1:-}" ;;
    --evidence-dir) shift; EVIDENCE_DIR="${1:-}" ;;
    --confirm-no-traffic-deploy) CONFIRMED=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

[[ "$CONFIRMED" == true ]] || { echo "Refusing Cloud Run mutation without --confirm-no-traffic-deploy" >&2; exit 2; }
[[ "$API_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid --api-digest" >&2; exit 2; }
[[ "$BROWSER_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid --browser-digest" >&2; exit 2; }
[[ "$TAG" =~ ^[a-z][a-z0-9-]{0,62}$ ]] || { echo "Invalid Cloud Run tag" >&2; exit 2; }
[[ -n "$EVIDENCE_DIR" ]] || { echo "--evidence-dir is required" >&2; exit 2; }
command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

python3 "$SCRIPT_DIR/verify-release-config.py"
mkdir -p "$EVIDENCE_DIR"
[[ -z "$(find "$EVIDENCE_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]] || {
  echo "Evidence directory must be empty: $EVIDENCE_DIR" >&2
  exit 1
}

API_BEFORE="$EVIDENCE_DIR/api-before.json"
BROWSER_BEFORE="$EVIDENCE_DIR/browser-before.json"
gcloud run services describe "$API_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$API_BEFORE"
gcloud run services describe "$BROWSER_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$BROWSER_BEFORE"

API_IMAGE="${REGISTRY}/gnomad-lr-api@${API_DIGEST}"
BROWSER_IMAGE="${REGISTRY}/gnomad-lr-browser@${BROWSER_DIGEST}"

echo ">>> Staging API digest with tag ${TAG} and zero traffic"
gcloud run services update "$API_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$API_IMAGE" \
  --env-vars-file="$API_ENV_FILE" \
  --tag="$TAG" \
  --no-traffic \
  --quiet

gcloud run services describe "$API_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$EVIDENCE_DIR/api-after.json"
API_TAG_URL="$(python3 - "$EVIDENCE_DIR/api-after.json" "$TAG" <<'PY'
import json, sys
service=json.load(open(sys.argv[1]))
urls=[x.get('url') for x in service.get('status',{}).get('traffic',[]) if x.get('tag')==sys.argv[2]]
if len(urls)!=1 or not urls[0]:
    raise SystemExit(f"expected one tagged API URL, got {urls}")
print(urls[0])
PY
)"

BROWSER_ENV="$(mktemp)"
trap 'rm -f "$BROWSER_ENV"' EXIT
python3 - "$BROWSER_ENV" "$API_TAG_URL" <<'PY'
import json, sys
open(sys.argv[1], 'w').write(json.dumps({'API_URL': sys.argv[2].rstrip('/') + '/api/'}) + '\n')
PY

echo ">>> Staging browser digest against ${API_TAG_URL} with zero traffic"
gcloud run services update "$BROWSER_SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$BROWSER_IMAGE" \
  --env-vars-file="$BROWSER_ENV" \
  --tag="$TAG" \
  --no-traffic \
  --quiet

gcloud run services describe "$BROWSER_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$EVIDENCE_DIR/browser-after.json"
python3 - "$EVIDENCE_DIR" "$TAG" "$API_IMAGE" "$BROWSER_IMAGE" "$API_TAG_URL" <<'PY'
import json, pathlib, sys
root=pathlib.Path(sys.argv[1])

def allocated_traffic(path):
    service=json.loads(path.read_text())
    return sorted(
        (item.get('revisionName'), item.get('percent'))
        for item in service.get('status',{}).get('traffic',[])
        if item.get('percent', 0) > 0
    )

for component in ('api', 'browser'):
    before=allocated_traffic(root/f'{component}-before.json')
    after=allocated_traffic(root/f'{component}-after.json')
    if before != after:
        raise SystemExit(f'{component} allocated traffic changed: {before} -> {after}')

summary={
  'schema_version': 1,
  'tag': sys.argv[2],
  'api_image': sys.argv[3],
  'browser_image': sys.argv[4],
  'api_tag_url': sys.argv[5],
  'traffic_changed_by_command': False,
  'terraform_applied': False,
}
(root/'deployment-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
PY

echo ">>> Tagged no-traffic revisions staged; evidence: $EVIDENCE_DIR"
echo ">>> Terraform was not applied and traffic was not updated. Validate before cutover."
