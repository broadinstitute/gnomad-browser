#!/usr/bin/env bash
# Apply only the exact private plan copy reviewed after latest staging evidence.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN=""; SUMMARY=""; RECEIPT=""; CONFIRMED=false
usage() { echo "Usage: terraform-apply-guard.sh --plan FILE --deployment-summary FILE --receipt FILE --confirm-reviewed-apply"; }
while (($#)); do
  case "$1" in
    --plan) shift; PLAN="${1:-}" ;;
    --deployment-summary) shift; SUMMARY="${1:-}" ;;
    --receipt) shift; RECEIPT="${1:-}" ;;
    --confirm-reviewed-apply) CONFIRMED=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
[[ "$CONFIRMED" == true ]] || { echo "Refusing apply without --confirm-reviewed-apply" >&2; exit 2; }
LATEST_MARKER="$SCRIPT_DIR/.latest-release-evidence.json"
[[ -f "$PLAN" && -f "$SUMMARY" && -f "$RECEIPT" ]] || { echo "plan, summary, and receipt are required" >&2; exit 2; }
[[ -f "$LATEST_MARKER" ]] || { echo "latest deployment evidence marker is missing" >&2; exit 1; }
command -v terraform >/dev/null || { echo "terraform is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required" >&2; exit 1; }

umask 077
LOCK_DIR="${TMPDIR:-/tmp}/gnomad-lr-terraform-apply-gnomadev.lock"
mkdir "$LOCK_DIR" 2>/dev/null || { echo "another guarded Terraform apply holds $LOCK_DIR" >&2; exit 1; }
PRIVATE_DIR="$(mktemp -d)"; chmod 700 "$PRIVATE_DIR"
PRIVATE_PLAN="$PRIVATE_DIR/reviewed.tfplan"; PLAN_JSON="$PRIVATE_DIR/reviewed-plan.json"
cleanup() { chmod 700 "$PRIVATE_DIR" 2>/dev/null || true; rm -rf "$PRIVATE_DIR"; rmdir "$LOCK_DIR" 2>/dev/null || true; }; trap cleanup EXIT
# One open/read and O_EXCL create prevents caller-path substitution between copy and hash.
PLAN_SHA256="$(python3 - "$PLAN" "$PRIVATE_PLAN" <<'PY'
import hashlib,os,sys
source,destination=sys.argv[1:]
h=hashlib.sha256(); fd=os.open(destination,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
try:
 with open(source,'rb') as src,os.fdopen(fd,'wb') as dst:
  while chunk:=src.read(1024*1024): h.update(chunk); dst.write(chunk)
  dst.flush(); os.fsync(dst.fileno())
except BaseException:
 try: os.unlink(destination)
 except FileNotFoundError: pass
 raise
print(h.hexdigest())
PY
)"
[[ "$(stat -f '%Lp' "$PRIVATE_PLAN" 2>/dev/null || stat -c '%a' "$PRIVATE_PLAN")" == 600 ]] || { echo "private Terraform plan copy is not mode 0600" >&2; exit 1; }
terraform -chdir="$SCRIPT_DIR" show -json "$PRIVATE_PLAN" >"$PLAN_JSON"
# After show, seal both the copied plan and its private directory against ordinary
# accidental substitution. The release lock excludes a second authorized apply.
chmod 400 "$PRIVATE_PLAN"; chmod 500 "$PRIVATE_DIR"
python3 - "$PLAN_JSON" "$SUMMARY" "$RECEIPT" "$LATEST_MARKER" <<'PY'
import datetime,hashlib,json,pathlib,sys
plan=json.loads(pathlib.Path(sys.argv[1]).read_text()); summary=json.loads(pathlib.Path(sys.argv[2]).read_text())
receipt=pathlib.Path(sys.argv[3]); marker=json.loads(pathlib.Path(sys.argv[4]).read_text())
def stamp(value): return datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
if summary.get('status')!='complete' or summary.get('phase')!='complete': raise SystemExit('deployment summary is not complete')
receipt_hash=hashlib.sha256(receipt.read_bytes()).hexdigest()
if receipt_hash!=summary.get('build_receipt_sha256'): raise SystemExit('deployment summary is not bound to this receipt')
if marker.get('status')!='complete': raise SystemExit('latest deployment evidence was invalidated by cleanup')
if marker.get('build_receipt_sha256')!=receipt_hash or marker.get('completed')!=summary.get('completed'): raise SystemExit('provided summary is not the latest deployment evidence')
if pathlib.Path(marker.get('deployment_summary','')).resolve()!=pathlib.Path(sys.argv[2]).resolve(): raise SystemExit('latest deployment marker names a different summary')
if plan.get('timestamp') is None: raise SystemExit('Terraform plan JSON has no creation timestamp')
if stamp(plan['timestamp'])<=stamp(summary['completed']): raise SystemExit('stale Terraform plan predates latest deployment evidence')
for change in plan.get('resource_changes',[]):
 if change.get('address') not in {'google_cloud_run_v2_service.api','google_cloud_run_v2_service.browser'}: continue
 before=(change.get('change') or {}).get('before') or {}; after=(change.get('change') or {}).get('after') or {}
 def release_fields(v):
  try:
   c=v['template'][0]['containers'][0]; return c.get('image'),c.get('env')
  except (KeyError,IndexError,TypeError): return None
 if release_fields(before)!=release_fields(after): raise SystemExit(f"plan attempts release-managed template change: {change['address']}")
print('verified post-deployment plan timestamp, receipt binding, release ownership, and private plan identity')
PY
# Re-hash the sealed private bytes immediately before apply. The caller's path is never
# reopened; lock plus non-writable private directory closes ordinary substitution.
[[ "$(python3 - "$PRIVATE_PLAN" <<'PY'
import hashlib,pathlib,sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)" == "$PLAN_SHA256" ]] || { echo "private Terraform plan changed after review" >&2; exit 1; }
terraform -chdir="$SCRIPT_DIR" apply "$PRIVATE_PLAN"
