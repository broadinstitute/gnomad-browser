#!/usr/bin/env bash
# Build immutable full-genome API/browser images from exact pre-hashed archive bytes.
# This script never runs Terraform or deploys Cloud Run.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECT_ID="gnomadev"
REGISTRY="us-docker.pkg.dev/${PROJECT_ID}/gnomad"
CLOUDBUILD_CONFIG="deploy/terraform/lr-viewer/cloudbuild.yaml"
ROUTING_MANIFEST="graphql-api/config/full-genome-routing-artifact-manifest.json"
EVIDENCE_TOOL="$SCRIPT_DIR/release-evidence.py"
BUILD_SUBMIT_TOOL="$SCRIPT_DIR/submit-generation-build.py"

BUILD_API=true
BUILD_BROWSER=true
SELECTION="all"
CONFIRMED=false
RESUME=false
RECEIPT_PATH=""
RECEIPT_INITIALIZED=false
PHASE="argument_validation"

usage() {
  cat <<'USAGE'
Usage: deploy.sh --confirm-build-push [--api-only|--browser-only] [--receipt PATH] [--resume]

Builds only tracked bytes from an exact pre-hashed git archive, pushes a unique
fullgenome-<sha>-<UTC> tag, and atomically journals build ID, received-source
checksum/generation, digest, and final image identity. --resume reconciles a partial
receipt without rebuilding a successful push. It never deploys or writes :latest.
USAGE
}

while (($#)); do
  case "$1" in
    --confirm-build-push) CONFIRMED=true ;;
    --resume) RESUME=true ;;
    --api-only)
      [[ "$SELECTION" == all ]] || { echo "--api-only conflicts with --browser-only" >&2; exit 2; }
      SELECTION=api; BUILD_BROWSER=false ;;
    --browser-only)
      [[ "$SELECTION" == all ]] || { echo "--browser-only conflicts with --api-only" >&2; exit 2; }
      SELECTION=browser; BUILD_API=false ;;
    --receipt) shift; [[ $# -gt 0 ]] || { echo "--receipt requires a path" >&2; exit 2; }; RECEIPT_PATH="$1" ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

[[ "$CONFIRMED" == true ]] || { echo "Refusing remote build/push without --confirm-build-push" >&2; exit 2; }
[[ "$BUILD_API" == true || "$BUILD_BROWSER" == true ]] || { echo "At least one component must be selected" >&2; exit 2; }
[[ "$RESUME" != true || -n "$RECEIPT_PATH" ]] || { echo "--resume requires --receipt" >&2; exit 2; }
command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }
command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
command -v tar >/dev/null || { echo "tar is required" >&2; exit 1; }

cd "$REPO_ROOT"
SOURCE_SHA="$(git rev-parse HEAD)"
[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Unable to resolve a full git SHA" >&2; exit 1; }

LOCK_DIR="${TMPDIR:-/tmp}/gnomad-lr-build-gnomadev.lock"
mkdir "$LOCK_DIR" 2>/dev/null || { echo "another LR build/reconcile invocation holds $LOCK_DIR" >&2; exit 1; }
WORK_DIR="$(mktemp -d)"; chmod 700 "$WORK_DIR"
ARCHIVE="$WORK_DIR/source.tar.gz"
SNAPSHOT="$WORK_DIR/source"; mkdir -m 700 "$SNAPSHOT"
cleanup() { rm -rf "$WORK_DIR"; rmdir "$LOCK_DIR" 2>/dev/null || true; }
on_error() {
  local status=$?; trap - ERR
  if [[ "$RECEIPT_INITIALIZED" == true ]]; then
    python3 "$EVIDENCE_TOOL" build-fail "$RECEIPT_PATH" "$PHASE" "$status" || true
  fi
  exit "$status"
}
trap cleanup EXIT
trap on_error ERR

PHASE="archive_source"
umask 077
git archive --format=tar.gz --output="$ARCHIVE" "$SOURCE_SHA"
chmod 400 "$ARCHIVE"
read -r SOURCE_ARCHIVE_SHA256 SOURCE_ARCHIVE_MD5 < <(python3 - "$ARCHIVE" <<'PY'
import base64,hashlib,pathlib,sys
b=pathlib.Path(sys.argv[1]).read_bytes()
print(hashlib.sha256(b).hexdigest(),base64.b64encode(hashlib.md5(b).digest()).decode())
PY
)
tar -xzf "$ARCHIVE" -C "$SNAPSHOT"

PHASE="verify_snapshot"
python3 "$SNAPSHOT/deploy/terraform/lr-viewer/verify-release-config.py"
ROUTING_MANIFEST_SHA256="$(python3 - "$SNAPSHOT/$ROUTING_MANIFEST" <<'PY'
import hashlib,pathlib,sys
print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)"

COMPONENTS=(); $BUILD_API && COMPONENTS+=(api); $BUILD_BROWSER && COMPONENTS+=(browser)
COMPONENT_CSV="$(IFS=,; echo "${COMPONENTS[*]}")"
if [[ "$RESUME" == true ]]; then
  [[ -f "$RECEIPT_PATH" ]] || { echo "resume receipt is missing" >&2; exit 1; }
  python3 "$EVIDENCE_TOOL" validate "$RECEIPT_PATH" >/dev/null
  [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" source_sha)" == "$SOURCE_SHA" ]] || { echo "resume source SHA differs from HEAD" >&2; exit 1; }
  [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" source_archive_sha256)" == "$SOURCE_ARCHIVE_SHA256" ]] || { echo "resume archive differs from recorded source bytes" >&2; exit 1; }
  [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" source_archive_md5)" == "$SOURCE_ARCHIVE_MD5" ]] || { echo "resume archive MD5 differs" >&2; exit 1; }
  [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" routing_artifact_manifest_sha256)" == "$ROUTING_MANIFEST_SHA256" ]] || { echo "resume routing manifest differs" >&2; exit 1; }
  [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" requested_components)" == "$(python3 - "$COMPONENT_CSV" <<'PY'
import json,sys; print(json.dumps(sys.argv[1].split(','),separators=(',',':')))
PY
)" ]] || { echo "resume component selection differs" >&2; exit 1; }
  python3 "$EVIDENCE_TOOL" build-resume "$RECEIPT_PATH"
  if [[ "$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" status)" == complete ]]; then
    RECEIPT_INITIALIZED=false; trap - ERR
    echo ">>> Build receipt is already complete; no build performed: $RECEIPT_PATH"
    exit 0
  fi
  RECEIPT_INITIALIZED=true
else
  CREATED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  STAMP="$(date -u -jf '%Y-%m-%dT%H:%M:%SZ' "$CREATED" +%Y%m%dt%H%M%Sz 2>/dev/null || date -u -d "$CREATED" +%Y%m%dt%H%M%Sz)"
  TAG="fullgenome-${SOURCE_SHA:0:12}-${STAMP}"
  CLOUD_RUN_TAG="fg-${SOURCE_SHA:0:8}-${STAMP}"
  [[ -n "$RECEIPT_PATH" ]] || RECEIPT_PATH="/tmp/gnomad-lr-${TAG}-images.json"
  PHASE="initialize_receipt"
  python3 "$EVIDENCE_TOOL" build-init "$RECEIPT_PATH" "$SOURCE_SHA" \
    "$SOURCE_ARCHIVE_SHA256" "$SOURCE_ARCHIVE_MD5" "$TAG" "$CLOUD_RUN_TAG" "$CREATED" \
    "$ROUTING_MANIFEST_SHA256" "$COMPONENT_CSV"
  RECEIPT_INITIALIZED=true
fi
TAG="$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" tag)"
CREATED="$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" created)"

# Upload once with a creation precondition and checksum, then bind every build to the
# exact immutable generation. Verify its SHA-256 before any untrusted source executes.
if python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" source_object >"$WORK_DIR/source-object-receipt.json" 2>/dev/null; then
  SOURCE_OBJECT_JSON="$(<"$WORK_DIR/source-object-receipt.json")"
  read -r SOURCE_BUCKET SOURCE_OBJECT SOURCE_GENERATION < <(python3 - "$SOURCE_OBJECT_JSON" <<'PY'
import json,sys
v=json.loads(sys.argv[1]); print(v['bucket'],v['object'],v['generation'])
PY
)
else
  SOURCE_BUCKET="${PROJECT_ID}_cloudbuild"
  SOURCE_OBJECT="lr-release-sources/${TAG}-${SOURCE_ARCHIVE_SHA256}.tar.gz"
  SOURCE_URI="gs://${SOURCE_BUCKET}/${SOURCE_OBJECT}"
  PHASE="upload_immutable_source"
  SOURCE_METADATA="$WORK_DIR/source-object.json"
  if ! gcloud storage objects describe "$SOURCE_URI" --format=json >"$SOURCE_METADATA" 2>/dev/null; then
    gcloud storage cp "$ARCHIVE" "$SOURCE_URI" --if-generation-match=0 --content-md5="$SOURCE_ARCHIVE_MD5" >/dev/null
    gcloud storage objects describe "$SOURCE_URI" --format=json >"$SOURCE_METADATA"
  fi
  read -r SOURCE_GENERATION SERVICE_MD5 < <(python3 - "$SOURCE_METADATA" "$SOURCE_BUCKET" "$SOURCE_OBJECT" "$SCRIPT_DIR" <<'PY'
import json,sys
sys.path.insert(0,sys.argv[4])
from gcloud_storage_metadata import object_md5
v=json.load(open(sys.argv[1])); bucket,obj=sys.argv[2:4]
if (v.get('bucket') or bucket)!=bucket or v.get('name')!=obj or not str(v.get('generation','')).isdigit(): raise SystemExit('uploaded source object identity mismatch')
try: md5_hash=object_md5(v)
except ValueError as error: raise SystemExit(error)
print(v['generation'],md5_hash)
PY
)
  [[ "$SERVICE_MD5" == "$SOURCE_ARCHIVE_MD5" ]] || { echo "uploaded source checksum mismatch" >&2; exit 1; }
  python3 "$EVIDENCE_TOOL" build-source-object "$RECEIPT_PATH" "$SOURCE_BUCKET" "$SOURCE_OBJECT" "$SOURCE_GENERATION" "$SERVICE_MD5"
fi
SOURCE_GENERATION_URI="gs://${SOURCE_BUCKET}/${SOURCE_OBJECT}#${SOURCE_GENERATION}"
PHASE="verify_immutable_source_generation"
gcloud storage cp "$SOURCE_GENERATION_URI" - >"$WORK_DIR/received-source.tar.gz"
read -r RECEIVED_SHA256 RECEIVED_MD5 < <(python3 - "$WORK_DIR/received-source.tar.gz" <<'PY'
import base64,hashlib,pathlib,sys
b=pathlib.Path(sys.argv[1]).read_bytes(); print(hashlib.sha256(b).hexdigest(),base64.b64encode(hashlib.md5(b).digest()).decode())
PY
)
[[ "$RECEIVED_SHA256" == "$SOURCE_ARCHIVE_SHA256" && "$RECEIVED_MD5" == "$SOURCE_ARCHIVE_MD5" ]] || { echo "immutable source generation differs from pre-hashed archive" >&2; exit 1; }
# Derive the submitted build configuration from the verified generation, not the local
# extracted tree. It remains in shell memory and is delivered over an inherited pipe.
CLOUDBUILD_CONFIG_CONTENT="$(gcloud storage cp "$SOURCE_GENERATION_URI" - | tar -xOzf - "$CLOUDBUILD_CONFIG")"

verify_received_source() {
  local component build_id build_json object_json
  component="$1"; build_id="$2"
  build_json="$WORK_DIR/${component}-build.json"; object_json="$WORK_DIR/${component}-source-object.json"
  local source_fields bucket object generation md5_hash
  gcloud builds describe "$build_id" --project="$PROJECT_ID" --format=json >"$build_json"
  source_fields="$(python3 - "$build_json" <<'PY'
import json,sys
v=json.load(open(sys.argv[1]))
if v.get('status')!='SUCCESS': raise SystemExit('Cloud Build is not successful')
s=v.get('sourceProvenance',{}).get('resolvedStorageSource',{})
if not s.get('bucket') or not s.get('object') or not str(s.get('generation','')).isdigit(): raise SystemExit('incomplete resolved Cloud Build source')
print(s['bucket']+'\t'+s['object']+'\t'+str(s['generation']))
PY
)"
  IFS=$'\t' read -r bucket object generation <<<"$source_fields"
  gcloud storage objects describe "gs://${bucket}/${object}#${generation}" --format=json >"$object_json"
  md5_hash="$(python3 - "$object_json" "$bucket" "$object" "$generation" "$SCRIPT_DIR" <<'PY'
import json,sys
sys.path.insert(0,sys.argv[5])
from gcloud_storage_metadata import object_md5
v=json.load(open(sys.argv[1])); bucket,obj,generation=sys.argv[2:5]
actual_bucket=v.get('bucket') or bucket
if actual_bucket!=bucket or v.get('name')!=obj or str(v.get('generation',''))!=generation: raise SystemExit('source object identity mismatch')
try: print(object_md5(v))
except ValueError as error: raise SystemExit(error)
PY
)"
  [[ "$md5_hash" == "$SOURCE_ARCHIVE_MD5" ]] || { echo "Cloud Build received source checksum differs from pre-hashed archive" >&2; return 1; }
  python3 "$EVIDENCE_TOOL" build-source "$RECEIPT_PATH" "$component" "$bucket" "$object" "$generation" "$md5_hash"
}

build_one() {
  local component dockerfile image state build_id build_output digest SUBSTITUTIONS_JSON submission_intent
  component="$1"; dockerfile="$2"; image="${REGISTRY}/gnomad-lr-${component}"
  state="$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" "components.${component}.state")"
  if [[ "$state" == recorded ]]; then echo ">>> ${component} already recorded; reconciling without rebuild"; return 0; fi
  if [[ "$state" == pending ]]; then
    PHASE="${component}_preflight"
    if gcloud artifacts docker images describe "${image}:${TAG}" --project="$PROJECT_ID" >/dev/null 2>&1; then
      echo "Refusing ambiguous existing image tag without a journaled build: ${image}:${TAG}" >&2; return 1
    fi
    # Persist one unique intent before create. It is copied into Cloud Build tags and
    # substitutions so a resume can recover create success after a local journal failure.
    submission_intent="$(python3 - <<'PY'
import uuid; print(uuid.uuid4())
PY
)"
    python3 "$EVIDENCE_TOOL" build-intent "$RECEIPT_PATH" "$component" "$submission_intent"
    state=intent_recorded
  fi
  if [[ "$state" == intent_recorded ]]; then
    echo ">>> Building or reconciling ${image}:${TAG} from exact archive ${SOURCE_ARCHIVE_SHA256} (${SOURCE_SHA})"
    PHASE="${component}_cloud_build"
    SUBSTITUTIONS_JSON="$(python3 - "$dockerfile" "$image" "$TAG" "$SOURCE_SHA" "$SOURCE_ARCHIVE_SHA256" "$CREATED" "$ROUTING_MANIFEST_SHA256" <<'PY'
import json,sys
keys=('_DOCKERFILE','_IMAGE','_TAG','_SOURCE_SHA','_SOURCE_ARCHIVE_SHA256','_CREATED','_ROUTING_MANIFEST_SHA256')
print(json.dumps(dict(zip(keys,sys.argv[1:]))|{'_LR_Y1_ENABLED':'true','_EXPERIMENTAL_FEATURES_ENABLED':'false'},separators=(',',':')))
PY
)"
    build_output="$(printf '%s\n' "$CLOUDBUILD_CONFIG_CONTENT" | python3 "$BUILD_SUBMIT_TOOL" submit \
      --project "$PROJECT_ID" --receipt "$RECEIPT_PATH" --component "$component" --evidence-tool "$EVIDENCE_TOOL" \
      --bucket "$SOURCE_BUCKET" --object "$SOURCE_OBJECT" --generation "$SOURCE_GENERATION" --substitutions "$SUBSTITUTIONS_JSON")"
    build_id="$(python3 - "$build_output" <<'PY'
import re,sys
m=sorted(set(re.findall(r'(?i)(?<![0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![0-9a-f])',sys.argv[1])))
if len(m)!=1: raise SystemExit(f'expected one Cloud Build UUID, got {m}')
print(m[0])
PY
)"
    # The helper reconciles by durable intent before create, records the build ID,
    # and advances to build_succeeded only after the service reports SUCCESS.
    state=build_succeeded
  fi
  if [[ "$state" == submitted ]]; then
    build_id="$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" "components.${component}.build_id")"
    PHASE="${component}_wait_submitted_build"
    python3 "$BUILD_SUBMIT_TOOL" wait --project "$PROJECT_ID" --receipt "$RECEIPT_PATH" --component "$component" --evidence-tool "$EVIDENCE_TOOL" --build-id "$build_id" >/dev/null
    state=build_succeeded
  fi
  if [[ "$state" == build_succeeded ]]; then
    build_id="$(python3 "$EVIDENCE_TOOL" get "$RECEIPT_PATH" "components.${component}.build_id")"
    PHASE="${component}_verify_received_source"
    verify_received_source "$component" "$build_id"
    PHASE="${component}_resolve_digest"
    digest="$(gcloud artifacts docker images describe "${image}:${TAG}" --project="$PROJECT_ID" --format='value(image_summary.digest)')"
    [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid resolved digest: $digest" >&2; return 1; }
    python3 "$EVIDENCE_TOOL" build-digest "$RECEIPT_PATH" "$component" "$digest"
    state=digest_resolved
  fi
  if [[ "$state" == digest_resolved ]]; then
    PHASE="${component}_record_evidence"
    python3 "$EVIDENCE_TOOL" build-record "$RECEIPT_PATH" "$component"
  fi
}

$BUILD_API && build_one api deploy/dockerfiles/browser/api.dockerfile
$BUILD_BROWSER && build_one browser deploy/dockerfiles/browser/browser.dockerfile
PHASE="finalize_receipt"
python3 "$EVIDENCE_TOOL" build-finish "$RECEIPT_PATH"
trap - ERR

echo ">>> Immutable image receipt: ${RECEIPT_PATH}"
echo ">>> No Terraform or Cloud Run deployment was performed."
