#!/usr/bin/env bash
# Stage one provenance-verified receipt as paired digest-pinned, zero-traffic revisions.
# Every mutation is journaled and failure cleanup is generation guarded.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="gnomadev"
REGION="us-east1"
API_SERVICE="gnomad-lr-api"
BROWSER_SERVICE="gnomad-lr-browser"
API_ENV_FILE="$SCRIPT_DIR/full-genome-api-env.json"
EVIDENCE_TOOL="$SCRIPT_DIR/release-evidence.py"
PROVENANCE_TOOL="$SCRIPT_DIR/verify-build-provenance.py"
LATEST_MARKER="$SCRIPT_DIR/.latest-release-evidence.json"

RECEIPT=""
EVIDENCE_DIR=""
CONFIRMED=false
RESUME=false
CLEANUP_ONLY=false
JOURNAL=""
PHASE="argument_validation"
TRAP_ACTIVE=false

usage() {
  cat <<'USAGE'
Usage: deploy-no-traffic.sh --receipt PATH --evidence-dir DIR \
  --confirm-no-traffic-deploy [--resume|--cleanup]

Validates one complete paired build receipt against Artifact Registry and Cloud Build,
then journals and stages both Cloud Run services with --no-traffic. --resume reconciles
an in-progress/failed run. --cleanup only removes this run's tags and zero-traffic
candidate revisions when the recorded service generation still matches.
USAGE
}

while (($#)); do
  case "$1" in
    --receipt) shift; RECEIPT="${1:-}" ;;
    --evidence-dir) shift; EVIDENCE_DIR="${1:-}" ;;
    --confirm-no-traffic-deploy) CONFIRMED=true ;;
    --resume) RESUME=true ;;
    --cleanup) CLEANUP_ONLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

[[ "$CONFIRMED" == true ]] || { echo "Refusing Cloud Run mutation without --confirm-no-traffic-deploy" >&2; exit 2; }
[[ -f "$RECEIPT" ]] || { echo "--receipt must name a build receipt" >&2; exit 2; }
[[ -n "$EVIDENCE_DIR" ]] || { echo "--evidence-dir is required" >&2; exit 2; }
[[ "$RESUME" != true || "$CLEANUP_ONLY" != true ]] || { echo "--resume and --cleanup conflict" >&2; exit 2; }
command -v gcloud >/dev/null || { echo "gcloud is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

# One release invocation owns the Cloud Run staging boundary. This prevents ordinary
# concurrent operators from racing separate evidence directories.
LOCK_DIR="${TMPDIR:-/tmp}/gnomad-lr-no-traffic-gnomadev.lock"
mkdir "$LOCK_DIR" 2>/dev/null || { echo "another LR no-traffic release invocation holds $LOCK_DIR" >&2; exit 1; }
release_lock() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
trap release_lock EXIT

umask 077
RECEIPT_SNAPSHOT="$EVIDENCE_DIR/build-receipt.json"
IDENTITY="$EVIDENCE_DIR/release-identity.json"
if [[ "$RESUME" == true || "$CLEANUP_ONLY" == true ]]; then
  [[ -d "$EVIDENCE_DIR" && -f "$RECEIPT_SNAPSHOT" && -f "$IDENTITY" ]] || { echo "resume/cleanup evidence or release identity is missing" >&2; exit 1; }
  cmp -s "$RECEIPT" "$RECEIPT_SNAPSHOT" || { echo "provided receipt differs from this run's snapshot" >&2; exit 1; }
  python3 "$EVIDENCE_TOOL" identity-check "$IDENTITY" "$RECEIPT_SNAPSHOT"
else
  mkdir -p "$EVIDENCE_DIR"; chmod 700 "$EVIDENCE_DIR"
  [[ -z "$(find "$EVIDENCE_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]] || {
    echo "Evidence directory must be empty (use --resume or --cleanup): $EVIDENCE_DIR" >&2; exit 1;
  }
  # Parse and hash the caller receipt exactly once. All later release identity comes
  # from the complete private identity object produced from those exact bytes.
  python3 "$EVIDENCE_TOOL" identity-init "$RECEIPT" "$RECEIPT_SNAPSHOT" "$IDENTITY" >/dev/null
fi
TAG="$(python3 "$EVIDENCE_TOOL" get "$IDENTITY" run_tag)"
API_IMAGE="$(python3 "$EVIDENCE_TOOL" get "$IDENTITY" images.api.repository)@$(python3 "$EVIDENCE_TOOL" get "$IDENTITY" images.api.digest)"
BROWSER_IMAGE="$(python3 "$EVIDENCE_TOOL" get "$IDENTITY" images.browser.repository)@$(python3 "$EVIDENCE_TOOL" get "$IDENTITY" images.browser.digest)"
[[ "$TAG" =~ ^[a-z][a-z0-9-]{0,62}$ ]] || { echo "Invalid receipt Cloud Run tag" >&2; exit 2; }
(( ${#TAG} + ${#API_SERVICE} <= 46 )) || { echo "Cloud Run tag is too long for ${API_SERVICE}" >&2; exit 2; }
(( ${#TAG} + ${#BROWSER_SERVICE} <= 46 )) || { echo "Cloud Run tag is too long for ${BROWSER_SERVICE}" >&2; exit 2; }
JOURNAL="$EVIDENCE_DIR/phase-journal.json"

PHASE="verify_release_config"
python3 "$SCRIPT_DIR/verify-release-config.py"
PHASE="verify_build_provenance"
if [[ "$RESUME" == true || "$CLEANUP_ONLY" == true ]]; then
  PROVENANCE_TMP="$(mktemp "$EVIDENCE_DIR/.provenance-recheck.XXXXXX")"; rm -f "$PROVENANCE_TMP"
  python3 "$PROVENANCE_TOOL" "$IDENTITY" "$PROVENANCE_TMP" >/dev/null
  cmp -s "$PROVENANCE_TMP" "$EVIDENCE_DIR/build-provenance.json" || {
    rm -f "$PROVENANCE_TMP"; echo "live build provenance differs from initial evidence" >&2; exit 1;
  }
  rm -f "$PROVENANCE_TMP"
else
  python3 "$PROVENANCE_TOOL" "$IDENTITY" "$EVIDENCE_DIR/build-provenance.json" >/dev/null
  python3 "$EVIDENCE_TOOL" journal-init "$JOURNAL" "$IDENTITY"
fi
python3 "$EVIDENCE_TOOL" verify-bindings "$IDENTITY" "$EVIDENCE_DIR/build-provenance.json" "$JOURNAL"

json_generation() {
  python3 - "$1" <<'PY'
import json, sys
v=json.load(open(sys.argv[1])); print(v.get('metadata',{}).get('generation',''))
PY
}
traffic_spec() {
  python3 - "$1" <<'PY'
import json, sys
v=json.load(open(sys.argv[1])); rows=[]
for x in v.get('status',{}).get('traffic',[]):
    if int(x.get('percent',0) or 0)>0 and x.get('revisionName'):
        rows.append(f"{x['revisionName']}={int(x['percent'])}")
print(','.join(sorted(rows)))
PY
}
candidate_info() {
  python3 - "$1" "$TAG" <<'PY'
import json, sys
v=json.load(open(sys.argv[1])); rows=[x for x in v.get('status',{}).get('traffic',[]) if x.get('tag')==sys.argv[2]]
if not rows: print('\t'); raise SystemExit
if len(rows)!=1 or not rows[0].get('revisionName'): raise SystemExit('ambiguous tagged candidate')
print(rows[0]['revisionName']+'\t'+str(rows[0].get('url','')))
PY
}
assert_revision_image() {
  local revision="$1" expected="$2" output="$3"
  gcloud run revisions describe "$revision" --project="$PROJECT_ID" --region="$REGION" --format=json >"$output" || return 1
  python3 - "$output" "$expected" <<'PY'
import json, sys
v=json.load(open(sys.argv[1])); containers=v.get('spec',{}).get('containers') or v.get('spec',{}).get('template',{}).get('spec',{}).get('containers') or []
images=[x.get('image') for x in containers]
if images != [sys.argv[2]]: raise SystemExit(f'candidate image mismatch: {images}')
PY
}
assert_traffic_unchanged() {
  [[ "$(traffic_spec "$1")" == "$(traffic_spec "$2")" ]] || {
    echo "allocated traffic changed: $(traffic_spec "$1") -> $(traffic_spec "$2")" >&2; return 1;
  }
}

revision_has_zero_traffic() {
  python3 - "$1" "$2" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); revision=sys.argv[2]
if sum(int(x.get('percent',0) or 0) for x in v.get('status',{}).get('traffic',[]) if x.get('revisionName')==revision)!=0:
    raise SystemExit('candidate revision has allocated traffic')
PY
}
revision_is_absent() {
  local revision="$1" output="$2"
  gcloud run revisions list --project="$PROJECT_ID" --region="$REGION" --format=json >"$output" || return 1
  python3 - "$output" "$revision" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); revision=sys.argv[2]
if not isinstance(v,list): raise SystemExit('revision absence query did not return a list')
if any((x.get('metadata') or {}).get('name')==revision or str(x.get('name','')).rsplit('/',1)[-1]==revision for x in v):
    raise SystemExit('candidate revision is still present')
PY
}

ROLLBACK_ERRORS=()
rollback_component() {
  local component="$1" service="$2" expected_image="$3"
  local before="$EVIDENCE_DIR/${component}-before.json" current="$EVIDENCE_DIR/${component}-rollback-current.json"
  local after="$EVIDENCE_DIR/${component}-rollback-after.json" revision_file="$EVIDENCE_DIR/${component}-rollback-revision.json"
  [[ -f "$before" ]] || return 0
  if ! gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" --format=json >"$current"; then
    ROLLBACK_ERRORS+=("${component}: describe failed"); return 0
  fi
  local info live_revision recorded_revision pending_revision revision patch
  info="$(candidate_info "$current")" || { ROLLBACK_ERRORS+=("${component}: candidate inspection failed"); return 0; }
  live_revision="${info%%$'\t'*}"
  pending_revision="$(python3 "$EVIDENCE_TOOL" get "$JOURNAL" "services.${component}.deletion_pending.revision" 2>/dev/null || true)"
  [[ "$pending_revision" != null ]] || pending_revision=""
  recorded_revision="$(python3 "$EVIDENCE_TOOL" get "$JOURNAL" "services.${component}.candidate_revision" 2>/dev/null || true)"
  revision="${live_revision:-${pending_revision:-$recorded_revision}}"
  [[ -n "$revision" ]] || return 0
  if [[ -n "$live_revision" && -n "$pending_revision" && "$live_revision" != "$pending_revision" ]]; then
    ROLLBACK_ERRORS+=("${component}: run tag no longer identifies deletion-pending revision"); return 0
  fi
  if ! revision_has_zero_traffic "$current" "$revision"; then
    ROLLBACK_ERRORS+=("${component}: candidate revision has traffic; refusing deletion"); return 0
  fi
  if ! assert_traffic_unchanged "$before" "$current"; then
    ROLLBACK_ERRORS+=("${component}: allocated traffic changed; refusing cleanup"); return 0
  fi
  if ! assert_revision_image "$revision" "$expected_image" "$revision_file"; then
    # A failed describe is success only when a separate list query proves absence.
    if revision_is_absent "$revision" "$EVIDENCE_DIR/${component}-revision-absence.json"; then
      patch="$(python3 - <<'PY'
import json; print(json.dumps({'deletion_pending':None,'deletion_state':'absent'}))
PY
)"
      python3 "$EVIDENCE_TOOL" journal-service "$JOURNAL" "$component" "${component}_cleanup_absent" "$patch" || ROLLBACK_ERRORS+=("${component}: unable to record proved absence")
      return 0
    fi
    ROLLBACK_ERRORS+=("${component}: cannot verify candidate image or absence"); return 0
  fi
  patch="$(python3 - "$revision" "$expected_image" "$service" <<'PY'
import json,sys
print(json.dumps({'deletion_pending':{'revision':sys.argv[1],'image':sys.argv[2],'service':sys.argv[3]},'deletion_state':'pending'}))
PY
)"
  # Persist identity before any deletion. A retry never depends on the live tag.
  if ! python3 "$EVIDENCE_TOOL" journal-service "$JOURNAL" "$component" "${component}_deletion_pending" "$patch"; then
    ROLLBACK_ERRORS+=("${component}: cannot persist deletion-pending identity"); return 0
  fi
  # Recheck the exact shell mutation identity immediately before the remote delete.
  python3 "$EVIDENCE_TOOL" assert-mutation "$IDENTITY" "$RECEIPT_SNAPSHOT" "$component" "$TAG" "$expected_image" || {
    ROLLBACK_ERRORS+=("${component}: release identity changed before deletion"); return 0;
  }
  # Do not restore archived traffic with an unconditional update. Deleting this exact
  # zero-traffic revision is concurrency-safe: Cloud Run refuses deletion if another
  # actor begins serving it, and successful deletion removes its tag.
  if ! gcloud run revisions delete "$revision" --project="$PROJECT_ID" --region="$REGION" --quiet; then
    ROLLBACK_ERRORS+=("${component}: zero-traffic revision deletion failed"); return 0
  fi
  if ! revision_is_absent "$revision" "$EVIDENCE_DIR/${component}-revision-absence.json"; then
    ROLLBACK_ERRORS+=("${component}: deletion returned but revision absence is unproved"); return 0
  fi
  if ! gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" --format=json >"$after"; then
    ROLLBACK_ERRORS+=("${component}: post-deletion service describe failed"); return 0
  fi
  if ! assert_traffic_unchanged "$before" "$after"; then
    ROLLBACK_ERRORS+=("${component}: allocated traffic changed during cleanup"); return 0
  fi
  info="$(candidate_info "$after")" || { ROLLBACK_ERRORS+=("${component}: post-deletion tag inspection failed"); return 0; }
  if [[ -n "${info%%$'\t'*}" ]]; then
    ROLLBACK_ERRORS+=("${component}: run tag remains after candidate deletion"); return 0
  fi
  patch="$(python3 - <<'PY'
import json; print(json.dumps({'deletion_pending':None,'deletion_state':'absent'}))
PY
)"
  python3 "$EVIDENCE_TOOL" journal-service "$JOURNAL" "$component" "${component}_cleanup_absent" "$patch" || ROLLBACK_ERRORS+=("${component}: unable to record proved absence")
}

rollback_all() {
  local reason="${1:-failure}" final_status="failed_partial"
  set +e
  rollback_component browser "$BROWSER_SERVICE" "$BROWSER_IMAGE"
  rollback_component api "$API_SERVICE" "$API_IMAGE"
  local errors_json
  errors_json="$(printf '%s\n' "${ROLLBACK_ERRORS[@]:-}" | python3 -c 'import json,sys; print(json.dumps([x.rstrip("\n") for x in sys.stdin if x.rstrip("\n")]))')"
  if [[ "$reason" == requested ]]; then
    if ((${#ROLLBACK_ERRORS[@]})); then final_status=cleanup_failed; else final_status=cleaned; fi
  fi
  python3 "$EVIDENCE_TOOL" journal-patch "$JOURNAL" "{\"status\":\"${final_status}\",\"phase\":\"cleanup_finished\",\"rollback_errors\":${errors_json}}" || true
  python3 - "$JOURNAL" "$EVIDENCE_DIR/cleanup-summary.json" "$LATEST_MARKER" "$EVIDENCE_DIR/deployment-summary.json" <<'PY'
import json,os,pathlib,sys,tempfile
journal=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]); marker=pathlib.Path(sys.argv[3]); summary=pathlib.Path(sys.argv[4])
value=json.loads(journal.read_text()); payload=json.dumps(value,indent=2,sort_keys=True)+'\n'
def replace(path,data):
 fd,tmp=tempfile.mkstemp(prefix='.'+path.name+'.',dir=path.parent)
 with os.fdopen(fd,'w') as f: f.write(data); f.flush(); os.fsync(f.fileno())
 os.replace(tmp,path)
replace(out,payload)
if marker.exists():
 current=json.loads(marker.read_text())
 if current.get('build_receipt_sha256')==value.get('build_receipt_sha256') and pathlib.Path(current.get('deployment_summary','')).resolve()==summary.resolve():
  replacement={'schema_version':1,'status':value.get('status'),'build_receipt_sha256':value.get('build_receipt_sha256'),'source_sha':value.get('source_sha'),'deployment_summary':str(summary.resolve()),'cleanup_summary':str(out.resolve()),'updated':value.get('updated')}
  replace(marker,json.dumps(replacement,indent=2,sort_keys=True)+'\n')
PY
  set -e
}

on_error() {
  local status=$? line=$1
  trap - ERR
  set +e
  if [[ "$TRAP_ACTIVE" == true ]]; then
    python3 "$EVIDENCE_TOOL" journal-patch "$JOURNAL" "{\"status\":\"failed_partial\",\"phase\":\"${PHASE}\",\"failure\":{\"exit_code\":${status},\"line\":${line}}}" || true
    rollback_all
  fi
  exit "$status"
}
trap 'on_error $LINENO' ERR
TRAP_ACTIVE=true

if [[ "$CLEANUP_ONLY" == true ]]; then
  PHASE="requested_cleanup"
  # Invalidate matching latest evidence before the first deletion. A crash midway
  # through cleanup must never leave an apply-eligible complete marker behind.
  python3 "$EVIDENCE_TOOL" journal-patch "$JOURNAL" '{"status":"cleanup_in_progress","phase":"requested_cleanup"}'
  python3 - "$JOURNAL" "$LATEST_MARKER" "$EVIDENCE_DIR/deployment-summary.json" <<'PY'
import json,os,pathlib,sys,tempfile
journal=json.load(open(sys.argv[1])); marker=pathlib.Path(sys.argv[2]); summary=pathlib.Path(sys.argv[3])
if marker.exists():
 current=json.loads(marker.read_text())
 if current.get('build_receipt_sha256')==journal.get('build_receipt_sha256') and pathlib.Path(current.get('deployment_summary','')).resolve()==summary.resolve():
  value={'schema_version':1,'status':'cleanup_in_progress','build_receipt_sha256':journal['build_receipt_sha256'],'source_sha':journal['source_sha'],'deployment_summary':str(summary.resolve()),'updated':journal['updated']}
  fd,tmp=tempfile.mkstemp(prefix='.'+marker.name+'.',dir=marker.parent)
  with os.fdopen(fd,'w') as f: json.dump(value,f,indent=2,sort_keys=True); f.write('\n'); f.flush(); os.fsync(f.fileno())
  os.replace(tmp,marker)
PY
  rollback_all requested
  if ((${#ROLLBACK_ERRORS[@]})); then exit 1; fi
  echo ">>> Cleanup complete; evidence retained at $EVIDENCE_DIR"
  exit 0
fi

if [[ "$RESUME" == true ]]; then
  JOURNAL_STATUS="$(python3 "$EVIDENCE_TOOL" get "$JOURNAL" status)"
  if [[ "$JOURNAL_STATUS" == complete ]]; then
    echo ">>> Deployment evidence is already complete; no mutation performed."
    exit 0
  fi
  if [[ "$JOURNAL_STATUS" == cleaned || "$JOURNAL_STATUS" == cleanup_failed ]]; then
    echo "Cleanup is terminal for this deployment run; use --cleanup to finish pending deletion" >&2
    exit 1
  fi
fi

stage_component() {
  local component="$1" service="$2" image="$3" env_file="$4"
  local before="$EVIDENCE_DIR/${component}-before.json" current="$EVIDENCE_DIR/${component}-current.json"
  local after="$EVIDENCE_DIR/${component}-after.json" revision_file="$EVIDENCE_DIR/${component}-revision.json"
  local info revision url generation pre_generation pre_traffic patch
  if [[ ! -f "$before" ]]; then
    PHASE="${component}_archive_before"
    gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" --format=json >"$before"
    pre_generation="$(json_generation "$before")"; pre_traffic="$(traffic_spec "$before")"
    [[ -n "$pre_generation" && -n "$pre_traffic" ]] || { echo "${component} pre-state lacks generation/traffic" >&2; return 1; }
    patch="$(python3 - "$pre_generation" "$pre_traffic" <<'PY'
import json,sys; print(json.dumps({'pre_generation':sys.argv[1],'pre_traffic':sys.argv[2]}))
PY
)"
    python3 "$EVIDENCE_TOOL" journal-service "$JOURNAL" "$component" "${component}_before_archived" "$patch"
  fi

  PHASE="${component}_reconcile"
  gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" --format=json >"$current"
  # Never stage over traffic that changed since this run's archived baseline.
  assert_traffic_unchanged "$before" "$current"
  info="$(candidate_info "$current")"
  revision="${info%%$'\t'*}"; url="${info#*$'\t'}"
  if [[ -n "$revision" ]]; then
    local recorded_generation recorded_revision
    recorded_generation="$(python3 "$EVIDENCE_TOOL" get "$JOURNAL" "services.${component}.expected_generation" 2>/dev/null || true)"
    recorded_revision="$(python3 "$EVIDENCE_TOOL" get "$JOURNAL" "services.${component}.candidate_revision" 2>/dev/null || true)"
    [[ -z "$recorded_generation" || "$recorded_generation" == "$(json_generation "$current")" ]] || {
      echo "${component} generation changed since its candidate was journaled" >&2; return 1;
    }
    [[ -z "$recorded_revision" || "$recorded_revision" == "$revision" ]] || {
      echo "${component} candidate revision changed since it was journaled" >&2; return 1;
    }
  fi
  if [[ -z "$revision" ]]; then
    PHASE="${component}_update_started"
    python3 "$EVIDENCE_TOOL" journal-patch "$JOURNAL" "{\"phase\":\"${PHASE}\"}"
    # Bind every shell-derived release input to the one-time identity immediately
    # before Cloud Run mutation; a replaced receipt snapshot stops here.
    python3 "$EVIDENCE_TOOL" assert-mutation "$IDENTITY" "$RECEIPT_SNAPSHOT" "$component" "$TAG" "$image"
    echo ">>> Staging ${component} digest with tag ${TAG} and zero traffic"
    gcloud run services update "$service" --project="$PROJECT_ID" --region="$REGION" \
      --image="$image" --env-vars-file="$env_file" --tag="$TAG" --no-traffic --quiet
    PHASE="${component}_describe_after"
    gcloud run services describe "$service" --project="$PROJECT_ID" --region="$REGION" --format=json >"$after"
    info="$(candidate_info "$after")"; revision="${info%%$'\t'*}"; url="${info#*$'\t'}"
  else
    cp "$current" "$after"
  fi
  [[ -n "$revision" ]] || { echo "${component} update produced no tagged revision" >&2; return 1; }
  assert_revision_image "$revision" "$image" "$revision_file"
  generation="$(json_generation "$after")"
  assert_traffic_unchanged "$before" "$after"
  patch="$(python3 - "$generation" "$revision" "$url" <<'PY'
import json,sys; print(json.dumps({'expected_generation':sys.argv[1],'candidate_revision':sys.argv[2],'tag_url':sys.argv[3]}))
PY
)"
  python3 "$EVIDENCE_TOOL" journal-service "$JOURNAL" "$component" "${component}_staged" "$patch"
  STAGED_URL="$url"
}

STAGED_URL=""
stage_component api "$API_SERVICE" "$API_IMAGE" "$API_ENV_FILE"
API_TAG_URL="$STAGED_URL"
[[ "$API_TAG_URL" == https://* ]] || { echo "invalid tagged API URL" >&2; false; }
BROWSER_ENV="$EVIDENCE_DIR/browser-env.json"
python3 - "$BROWSER_ENV" "$API_TAG_URL" <<'PY'
import json,sys
open(sys.argv[1],'w').write(json.dumps({'API_URL':sys.argv[2].rstrip('/')+'/api/'})+'\n')
PY
stage_component browser "$BROWSER_SERVICE" "$BROWSER_IMAGE" "$BROWSER_ENV"
BROWSER_TAG_URL="$STAGED_URL"
[[ "$BROWSER_TAG_URL" == https://* ]] || { echo "invalid tagged browser URL" >&2; false; }

PHASE="final_postconditions"
gcloud run services describe "$API_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$EVIDENCE_DIR/api-final.json"
gcloud run services describe "$BROWSER_SERVICE" --project="$PROJECT_ID" --region="$REGION" --format=json >"$EVIDENCE_DIR/browser-final.json"
assert_traffic_unchanged "$EVIDENCE_DIR/api-before.json" "$EVIDENCE_DIR/api-final.json"
assert_traffic_unchanged "$EVIDENCE_DIR/browser-before.json" "$EVIDENCE_DIR/browser-final.json"

COMPLETED="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
python3 "$EVIDENCE_TOOL" verify-bindings "$IDENTITY" "$EVIDENCE_DIR/build-provenance.json" "$JOURNAL"
python3 "$EVIDENCE_TOOL" journal-patch "$JOURNAL" "{\"status\":\"complete\",\"phase\":\"complete\",\"completed\":\"${COMPLETED}\",\"traffic_changed_by_command\":false,\"terraform_applied\":false}"
python3 "$EVIDENCE_TOOL" copy "$JOURNAL" "$EVIDENCE_DIR/deployment-summary.json" --exclusive
python3 - "$JOURNAL" "$LATEST_MARKER" "$EVIDENCE_DIR/deployment-summary.json" <<'PY'
import json,os,pathlib,sys,tempfile
journal=json.loads(pathlib.Path(sys.argv[1]).read_text())
value={'schema_version':1,'status':'complete','completed':journal['completed'],'build_receipt_sha256':journal['build_receipt_sha256'],'source_sha':journal['source_sha'],'deployment_summary':str(pathlib.Path(sys.argv[3]).resolve())}
out=pathlib.Path(sys.argv[2]); fd,tmp=tempfile.mkstemp(prefix='.'+out.name+'.',dir=out.parent)
with os.fdopen(fd,'w') as f: json.dump(value,f,indent=2,sort_keys=True); f.write('\n'); f.flush(); os.fsync(f.fileno())
os.replace(tmp,out)
PY
TRAP_ACTIVE=false
trap - ERR

echo ">>> Paired tagged no-traffic revisions staged; evidence: $EVIDENCE_DIR"
echo ">>> Terraform was not applied and traffic was not updated."
