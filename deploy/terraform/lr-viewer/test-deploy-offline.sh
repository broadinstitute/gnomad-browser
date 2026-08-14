#!/usr/bin/env bash
# Deterministic release tests. All gcloud/terraform behavior is synthetic and local.
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TMP_DIR="$(mktemp -d)"
LATEST_MARKER="$SCRIPT_DIR/.latest-release-evidence.json"
MARKER_BACKUP="$TMP_DIR/latest-marker.backup"
HAD_MARKER=false
if [[ -f "$LATEST_MARKER" ]]; then cp "$LATEST_MARKER" "$MARKER_BACKUP"; HAD_MARKER=true; fi
SECRET_TFVARS="$ROOT/release-safety-test.tfvars"
SECRET_ENV="$ROOT/browser/build.env"
SECRET_AGENT="$ROOT/.agent/release-safety-test"
cleanup() {
  rm -f "$SECRET_TFVARS" "$SECRET_ENV" "$SECRET_AGENT"
  rmdir "$ROOT/.agent" 2>/dev/null || true
  if [[ "$HAD_MARKER" == true ]]; then cp "$MARKER_BACKUP" "$LATEST_MARKER"; else rm -f "$LATEST_MARKER"; fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT
mkdir -p "$TMP_DIR/bin" "$ROOT/.agent"
printf 'synthetic_secret="never-upload"\n' >"$SECRET_TFVARS"
printf 'SYNTHETIC_SECRET=never-upload\n' >"$SECRET_ENV"
printf 'never-upload\n' >"$SECRET_AGENT"
for ignored_fixture in "$SECRET_TFVARS" "$SECRET_ENV" "$SECRET_AGENT"; do
  git -C "$ROOT" check-ignore -q "$ignored_fixture"
done

REAL_SHA="$(git -C "$ROOT" rev-parse HEAD)"
FAKE_DIGEST="sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
FAKE_BROWSER_DIGEST="sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
API_BUILD="11111111-2222-4333-8444-555555555555"
BROWSER_BUILD="66666666-7777-4888-8999-aaaaaaaaaaaa"
export ROOT REAL_SHA FAKE_DIGEST FAKE_BROWSER_DIGEST API_BUILD BROWSER_BUILD

python3 "$SCRIPT_DIR/test-verify-release-config.py"

cat >"$TMP_DIR/bin/gcloud" <<'PY'
#!/usr/bin/env python3
import base64, hashlib, json, os, pathlib, shutil, sys, tempfile
args=sys.argv[1:]; log=os.environ.get('GCLOUD_LOG')
if log:
    with open(log,'a') as f: f.write(json.dumps(args)+'\n')

def has(x): return any(a==x or a.startswith(x+'=') for a in args)
def value(prefix):
    for i,a in enumerate(args):
        if a.startswith(prefix+'='): return a.split('=',1)[1]
        if a==prefix and i+1<len(args): return args[i+1]
    return ''
def out(v): print(json.dumps(v,separators=(',',':')) if isinstance(v,(dict,list)) else v)

build_dir=pathlib.Path(os.environ.get('FAKE_BUILD_DIR','/nonexistent'))
if args[:2]==['builds','list']:
    tag=value('--filter').split('=',1)[-1]; rows=[]
    if build_dir.exists():
        for p in build_dir.glob('*.json'):
            build=json.loads(p.read_text())
            if tag in build.get('tags',[]): rows.append(build)
    out(rows); sys.exit(0)
if args[:2]==['builds','submit']:
    assert has('--no-source'); body=json.loads(pathlib.Path(value('--config')).read_text()); source=body['source']['storageSource']
    source_bucket,source_object,generation=source['bucket'],source['object'],str(source['generation'])
    assert generation=='1' and 'cloudbuild.yaml' not in source_object
    config=json.dumps(body); assert '_SOURCE_ARCHIVE_SHA256' in config and 'gcr.io/cloud-builders/docker@sha256:' in config
    subs=body['substitutions']; comp=subs['_COMPONENT']; assert subs['_SOURCE_GENERATION']==generation and subs['_SUBMISSION_INTENT']
    assert subs['_LR_Y1_ENABLED']=='true' and subs['_EXPERIMENTAL_FEATURES_ENABLED']=='false'
    assert 'lr-intent-'+subs['_SUBMISSION_INTENT'].replace('-','') in body['tags']
    if os.environ.get('FAIL_BUILD_COMPONENT')==comp: sys.exit(42)
    receipt=json.load(open(os.environ['ACTIVE_RECEIPT'])); expected=receipt['source_object']; assert (source_bucket,source_object,generation)==(expected['bucket'],expected['object'],expected['generation'])
    build_id=os.environ['BROWSER_BUILD'] if comp=='browser' else os.environ['API_BUILD']
    build_dir.mkdir(parents=True,exist_ok=True); body['id']=build_id; body['status']='SUCCESS'; (build_dir/(build_id+'.json')).write_text(json.dumps(body))
    if os.environ.get('FAIL_LOCAL_JOURNAL_AFTER_CREATE')==comp: pathlib.Path(os.environ['ACTIVE_RECEIPT']).parent.chmod(0o500)
    out(build_id); sys.exit(0)
if args[:4]==['artifacts','docker','images','describe']:
    ref=args[4]
    if has('--format') and 'image_summary.digest' in value('--format'):
        comp='browser' if 'browser' in ref else 'api'
        if os.environ.get('FAIL_DIGEST_COMPONENT')==comp: sys.exit(57)
        out(os.environ['FAKE_BROWSER_DIGEST'] if comp=='browser' else os.environ['FAKE_DIGEST']); sys.exit(0)
    if '@sha256:' not in ref: sys.exit(1)
    digest='sha256:'+ref.rsplit('@sha256:',1)[1]
    comp='browser' if 'browser' in ref else 'api'
    out({'name':f'projects/p/locations/us/repositories/gnomad/packages/gnomad-lr-{comp}/versions/{digest}','image_summary':{'digest':digest}}); sys.exit(0)
if args[:2]==['builds','describe']:
    bid=args[2]; comp='browser' if bid==os.environ['BROWSER_BUILD'] else 'api'
    digest=os.environ['FAKE_BROWSER_DIGEST'] if comp=='browser' else os.environ['FAKE_DIGEST']
    target=os.environ.get('REPLACE_RECEIPT_TARGET'); replacement=os.environ.get('REPLACE_RECEIPT_WITH'); marker=os.environ.get('REPLACE_RECEIPT_MARKER')
    if target and replacement and marker and not pathlib.Path(marker).exists():
        target=pathlib.Path(target); fd,temp=tempfile.mkstemp(prefix='.receipt-replace.',dir=target.parent); os.close(fd); shutil.copyfile(replacement,temp); os.replace(temp,target); pathlib.Path(marker).touch()
    receipt=json.load(open(os.environ['ACTIVE_RECEIPT'])); item=receipt['components'][comp]; image=item['image']
    completed=receipt.get('completed',receipt['updated'])
    out({'id':bid,'status':'SUCCESS','createTime':receipt['created'],'finishTime':completed,'substitutions':{
      '_IMAGE':image,'_TAG':receipt['tag'],'_SOURCE_SHA':receipt['source_sha'],'_CREATED':receipt['created'],
      '_SOURCE_ARCHIVE_SHA256':receipt['source_archive_sha256'],
      '_ROUTING_MANIFEST_SHA256':receipt['routing_artifact_manifest_sha256'],
      '_SUBMISSION_INTENT':item['submission_intent'],'_SOURCE_GENERATION':str(receipt['source_object']['generation']),'_COMPONENT':comp,
      '_LR_Y1_ENABLED':'true','_EXPERIMENTAL_FEATURES_ENABLED':'false'},
      'options':{'requestedVerifyOption':'VERIFIED'},
      'steps':[{'args':['--label=org.opencontainers.image.created='+receipt['created'],'--label=org.opencontainers.image.revision='+receipt['source_sha'],
        '--label=org.gnomad.source-archive.sha256='+receipt['source_archive_sha256'],
        '--label=org.gnomad.lr.routing-manifest.sha256='+receipt['routing_artifact_manifest_sha256'],
        '--label=org.gnomad.experimental-features.enabled=false']}],
      'sourceProvenance':{'resolvedStorageSource':{k:receipt['source_object'][k] for k in ('bucket','object','generation')}},
      'results':{'images':[{'name':image+':'+receipt['tag'],'digest':digest}]}}); sys.exit(0)
if args[:3]==['storage','objects','describe']:
    url=args[3]; bucket=url.split('/')[2]; name=url.split('/',3)[-1].rsplit('#',1)[0]; p=pathlib.Path(os.environ['FAKE_OBJECT_DIR'])/'immutable-source.tgz'; data=p.read_bytes()
    checksum=base64.b64encode(hashlib.md5(data).digest()).decode(); shape=os.environ.get('FAKE_MD5_SHAPE','snake')
    metadata={'bucket':bucket,'name':name,'generation':'1'}
    if shape=='snake': metadata['md5_hash']=checksum
    elif shape=='camel': metadata['md5Hash']=checksum
    elif shape=='both': metadata.update({'md5_hash':checksum,'md5Hash':checksum})
    elif shape=='conflict': metadata.update({'md5_hash':checksum,'md5Hash':base64.b64encode(bytes(16)).decode()})
    elif shape!='missing': raise AssertionError('unknown FAKE_MD5_SHAPE '+shape)
    out(metadata); sys.exit(0)
if args[:2]==['storage','cp']:
    source,destination=args[2:4]; objects=pathlib.Path(os.environ['FAKE_OBJECT_DIR']); objects.mkdir(parents=True,exist_ok=True)
    if destination=='-': sys.stdout.buffer.write((objects/'immutable-source.tgz').read_bytes()); sys.exit(0)
    archive=pathlib.Path(source); assert archive.is_file(); assert archive.stat().st_mode & 0o777==0o400
    import tarfile
    with tarfile.open(archive) as tf:
        names=set(tf.getnames())
        for rel in ('release-safety-test.tfvars','browser/build.env','.agent/release-safety-test'): assert rel not in names, rel
        assert 'deploy/terraform/lr-viewer/cloudbuild.yaml' in names
    expected=value('--content-md5'); data=archive.read_bytes(); assert base64.b64encode(hashlib.md5(data).digest()).decode()==expected
    shutil.copyfile(archive,objects/'immutable-source.tgz'); (objects/'source-name').write_text(destination.split('/',3)[-1])
    if os.environ.get('MUTATE_LOCAL_ARCHIVE_AFTER_UPLOAD')=='true': archive.chmod(0o600); archive.write_bytes(b'substituted-after-upload')
    sys.exit(0)

state=pathlib.Path(os.environ.get('FAKE_STATE_DIR','/nonexistent'))
def service_path(name): return state/(name+'.json')
def revision_path(name): return state/('revision-'+name+'.json')
def service(name): return json.loads(service_path(name).read_text())
def save(name,v): service_path(name).write_text(json.dumps(v))
def component(name): return 'api' if name.endswith('-api') else 'browser'
if args[:3]==['run','services','describe']:
    out(service(args[3])); sys.exit(0)
if args[:3]==['run','revisions','describe']:
    p=revision_path(args[3])
    if not p.exists(): sys.exit(1)
    out(json.loads(p.read_text())); sys.exit(0)
if args[:3]==['run','services','update']:
    name=args[3]; comp=component(name); fail=os.environ.get('FAIL_POINT','').split(',')
    if comp+'_before' in fail: sys.exit(51)
    v=service(name); tag=value('--tag'); image=value('--image'); gen=int(v['metadata']['generation'])+1
    rev=f'{name}-{tag}'; v['metadata']['generation']=str(gen)
    v['status']['traffic']=[x for x in v['status']['traffic'] if x.get('tag')!=tag]
    percent=10 if 'traffic_drift' in fail and comp=='browser' else 0
    if percent: v['status']['traffic'][0]['percent']=90
    v['status']['traffic'].append({'revisionName':rev,'percent':percent,'tag':tag,'url':f'https://{tag}---{name}.example'})
    save(name,v); revision_path(rev).write_text(json.dumps({'spec':{'containers':[{'image':image}]}}))
    if comp+'_after' in fail: sys.exit(52)
    out({}); sys.exit(0)
if args[:3]==['run','services','update-traffic']:
    name=args[3]
    if 'rollback_failure' in os.environ.get('FAIL_POINT','').split(','): sys.exit(53)
    v=service(name); tag=value('--remove-tags'); specs=value('--to-revisions').split(',')
    v['metadata']['generation']=str(int(v['metadata']['generation'])+1); traffic=[]
    for spec in specs:
        rev,pct=spec.rsplit('=',1); traffic.append({'revisionName':rev,'percent':int(pct)})
    v['status']['traffic']=traffic; save(name,v); out({}); sys.exit(0)
if args[:3]==['run','revisions','delete']:
    marker=os.environ.get('EXPECT_CLEANUP_MARKER')
    if marker: assert json.load(open(marker))['status']=='cleanup_in_progress'
    revision=args[3]; comp='browser' if 'browser' in revision else 'api'; name='gnomad-lr-'+comp
    if os.environ.get('FAIL_DELETE_COMPONENT')==comp:
        v=service(name); v['status']['traffic']=[x for x in v['status']['traffic'] if x.get('revisionName')!=revision]; save(name,v); sys.exit(54)
    revision_path(revision).unlink(missing_ok=True); v=service(name)
    v['status']['traffic']=[x for x in v['status']['traffic'] if x.get('revisionName')!=revision]; save(name,v); out({}); sys.exit(0)
if args[:3]==['run','revisions','list']:
    rows=[{'metadata':{'name':p.stem[len('revision-'):]}} for p in state.glob('revision-*.json')]
    out(rows); sys.exit(0)
print('unexpected fake gcloud:',args,file=sys.stderr); sys.exit(98)
PY
chmod +x "$TMP_DIR/bin/gcloud"
export PATH="$TMP_DIR/bin:$PATH" GCLOUD_LOG="$TMP_DIR/gcloud.log" FAKE_OBJECT_DIR="$TMP_DIR/source-objects" FAKE_BUILD_DIR="$TMP_DIR/remote-builds" LR_RELEASE_FAKE_BUILD_API=true

# Confirmation and conflicting selection are rejected before any remote command.
set +e
"$SCRIPT_DIR/deploy.sh" --api-only >"$TMP_DIR/refusal" 2>&1; s1=$?
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --browser-only >"$TMP_DIR/conflict" 2>&1; s2=$?
set -e
[[ $s1 -eq 2 && $s2 -eq 2 ]]
grep -q 'Refusing remote build/push' "$TMP_DIR/refusal"
grep -q 'conflicts' "$TMP_DIR/conflict"
[[ ! -e "$GCLOUD_LOG" ]]

# A complete receipt binds the exact archive and excludes ignored local files.
export ACTIVE_RECEIPT="$TMP_DIR/build.json" MUTATE_LOCAL_ARCHIVE_AFTER_UPLOAD=true
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/build.out"
unset MUTATE_LOCAL_ARCHIVE_AFTER_UPLOAD
python3 - "$ACTIVE_RECEIPT" "$REAL_SHA" <<'PY'
import json,re,sys
v=json.load(open(sys.argv[1])); assert v['status']=='complete'; assert v['source_sha']==sys.argv[2]
assert re.fullmatch('[0-9a-f]{64}',v['source_archive_sha256']); assert set(v['images'])=={'api','browser'}
assert all(v['components'][c]['state']=='recorded' for c in ('api','browser'))
assert v['source_object']['md5_hash']==v['source_archive_md5']
PY

# Both gcloud checksum spellings normalize to the canonical receipt field. Missing,
# malformed, and conflicting metadata fail closed before any build submission.
python3 - "$SCRIPT_DIR" <<'PY'
import base64,sys
sys.path.insert(0,sys.argv[1])
from gcloud_storage_metadata import object_md5
checksum=base64.b64encode(bytes(range(16))).decode()
assert object_md5({'md5_hash':checksum})==checksum
assert object_md5({'md5Hash':checksum})==checksum
assert object_md5({'md5_hash':checksum,'md5Hash':checksum})==checksum
for metadata in ({},{'md5_hash':''},{'md5Hash':'not-base64'},{'md5_hash':checksum,'md5Hash':base64.b64encode(bytes(16)).decode()}):
    try: object_md5(metadata)
    except ValueError: pass
    else: raise AssertionError(f'accepted invalid checksum metadata: {metadata}')
PY
export ACTIVE_RECEIPT="$TMP_DIR/camel-build.json" FAKE_MD5_SHAPE=camel
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" >/dev/null
[[ "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$ACTIVE_RECEIPT" source_object.md5_hash)" == "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$ACTIVE_RECEIPT" source_archive_md5)" ]]
for shape in missing conflict; do
  export ACTIVE_RECEIPT="$TMP_DIR/${shape}-checksum.json" FAKE_MD5_SHAPE="$shape"
  set +e
  "$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/${shape}-checksum.out" 2>&1
  checksum_status=$?
  set -e
  [[ $checksum_status -ne 0 ]]
done
grep -q 'missing an MD5 checksum' "$TMP_DIR/missing-checksum.out"
grep -q 'conflicting MD5 checksum aliases' "$TMP_DIR/conflict-checksum.out"
unset FAKE_MD5_SHAPE
export ACTIVE_RECEIPT="$TMP_DIR/build.json"

# The review's mismatched SHA/tag/run-tag and malformed timestamp receipt is rejected.
python3 - "$ACTIVE_RECEIPT" "$TMP_DIR/mismatched-receipt.json" <<'PY'
import json,pathlib,sys
v=json.load(open(sys.argv[1])); v['source_sha']='a'*40; v['created']='not-a-time'; pathlib.Path(sys.argv[2]).write_text(json.dumps(v))
PY
set +e
python3 "$SCRIPT_DIR/release-evidence.py" validate "$TMP_DIR/mismatched-receipt.json" --require-pair >"$TMP_DIR/mismatched.out" 2>&1; mismatched=$?
set -e
[[ $mismatched -ne 0 ]]

# Existing evidence is exclusive; partial success remains durable.
set +e
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/existing" 2>&1; existing=$?
set -e
[[ $existing -ne 0 ]]
export ACTIVE_RECEIPT="$TMP_DIR/partial.json" FAIL_BUILD_COMPONENT=browser
set +e
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/partial.out" 2>&1; partial=$?
set -e
unset FAIL_BUILD_COMPONENT
[[ $partial -ne 0 ]]
python3 - "$ACTIVE_RECEIPT" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); assert v['status']=='failed_partial'; assert set(v['images'])=={'api'}; assert v['failure']['phase']=='browser_cloud_build'
assert v['components']['api']['state']=='recorded' and v['components']['browser']['state']=='intent_recorded'
PY

# A post-submit digest failure preserves the build ID and resumes without rebuilding.
export ACTIVE_RECEIPT="$TMP_DIR/post-submit.json" FAIL_DIGEST_COMPONENT=api
set +e
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/post-submit.out" 2>&1; post_submit=$?
set -e
unset FAIL_DIGEST_COMPONENT
[[ $post_submit -ne 0 ]]
python3 - "$ACTIVE_RECEIPT" "$API_BUILD" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); c=v['components']['api']; assert v['status']=='failed_partial'; assert c['state']=='build_succeeded'; assert c['build_id']==sys.argv[2]
PY
builds_before="$(grep -c '\[\"builds\", \"submit\"' "$GCLOUD_LOG")"
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" --resume >/dev/null
builds_after="$(grep -c '\[\"builds\", \"submit\"' "$GCLOUD_LOG")"
[[ "$builds_before" == "$builds_after" ]]
[[ "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$ACTIVE_RECEIPT" status)" == complete ]]

# Create success followed by a local journal failure is recovered by durable intent;
# resume finds the one matching remote build and never creates a duplicate.
mkdir "$TMP_DIR/create-gap"
export ACTIVE_RECEIPT="$TMP_DIR/create-gap/build.json" FAIL_LOCAL_JOURNAL_AFTER_CREATE=api
creates_before="$(grep -c '\[\"builds\", \"submit\"' "$GCLOUD_LOG")"
set +e
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" >"$TMP_DIR/create-gap.out" 2>&1
create_gap=$?
set -e
chmod 700 "$TMP_DIR/create-gap"; unset FAIL_LOCAL_JOURNAL_AFTER_CREATE
[[ $create_gap -ne 0 ]]
python3 - "$ACTIVE_RECEIPT" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); c=v['components']['api']
assert v['status']=='in_progress' and c['state']=='intent_recorded' and c['submission_intent']
PY
# Two exact remote matches are ambiguous and must not be guessed between.
python3 - "$FAKE_BUILD_DIR/$API_BUILD.json" "$FAKE_BUILD_DIR/22222222-3333-4444-8555-666666666666.json" <<'PY'
import json,pathlib,sys
v=json.load(open(sys.argv[1])); v['id']='22222222-3333-4444-8555-666666666666'; pathlib.Path(sys.argv[2]).write_text(json.dumps(v))
PY
set +e
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" --resume >"$TMP_DIR/create-ambiguity.out" 2>&1
ambiguity=$?
set -e
[[ $ambiguity -ne 0 ]]; grep -q 'ambiguous Cloud Build submission intent' "$TMP_DIR/create-ambiguity.out"
rm "$FAKE_BUILD_DIR/22222222-3333-4444-8555-666666666666.json"
"$SCRIPT_DIR/deploy.sh" --confirm-build-push --api-only --receipt "$ACTIVE_RECEIPT" --resume >/dev/null
creates_after="$(grep -c '\[\"builds\", \"submit\"' "$GCLOUD_LOG")"
[[ "$creates_before" -lt "$creates_after" && $((creates_before + 1)) -eq "$creates_after" ]]
[[ "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$ACTIVE_RECEIPT" components.api.build_id)" == "$API_BUILD" ]]
[[ "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$ACTIVE_RECEIPT" status)" == complete ]]

# Use the valid paired receipt for staging provenance and failure tests.
export ACTIVE_RECEIPT="$TMP_DIR/build.json"
init_state() {
  local dir="$1"; mkdir -p "$dir"
  python3 - "$dir" <<'PY'
import json,pathlib,sys
root=pathlib.Path(sys.argv[1])
for comp in ('api','browser'):
 name='gnomad-lr-'+comp; rev=name+'-stable'
 (root/(name+'.json')).write_text(json.dumps({'metadata':{'generation':'1'},'status':{'traffic':[{'revisionName':rev,'percent':100}]}}))
 (root/('revision-'+rev+'.json')).write_text(json.dumps({'spec':{'containers':[{'image':'stable'}]}}))
PY
}
assert_clean_state() {
  python3 - "$1" <<'PY'
import json,pathlib,sys
root=pathlib.Path(sys.argv[1])
for comp in ('api','browser'):
 v=json.loads((root/('gnomad-lr-'+comp+'.json')).read_text()); assert v['status']['traffic']==[{'revisionName':'gnomad-lr-'+comp+'-stable','percent':100}]
 assert not list(root.glob('revision-gnomad-lr-'+comp+'-fg-*'))
PY
}

# Provenance accepts both live metadata schemas and rejects missing/conflicting aliases.
python3 "$SCRIPT_DIR/release-evidence.py" identity-init "$ACTIVE_RECEIPT" "$TMP_DIR/provenance-receipt.json" "$TMP_DIR/provenance-identity.json" >/dev/null
for shape in snake camel both; do
  FAKE_MD5_SHAPE="$shape" python3 "$SCRIPT_DIR/verify-build-provenance.py" "$TMP_DIR/provenance-identity.json" "$TMP_DIR/${shape}-provenance.json" >/dev/null
done
for shape in missing conflict; do
  set +e
  FAKE_MD5_SHAPE="$shape" python3 "$SCRIPT_DIR/verify-build-provenance.py" "$TMP_DIR/provenance-identity.json" "$TMP_DIR/${shape}-provenance.json" >"$TMP_DIR/${shape}-provenance.out" 2>&1
  provenance_status=$?
  set -e
  [[ $provenance_status -ne 0 ]]
done
grep -q 'missing an MD5 checksum' "$TMP_DIR/missing-provenance.out"
grep -q 'conflicting MD5 checksum aliases' "$TMP_DIR/conflict-provenance.out"

# Provenance downloads each exact generation: altered received bytes are rejected.
cp "$FAKE_OBJECT_DIR/immutable-source.tgz" "$TMP_DIR/browser-source.backup"
printf 'substituted' >>"$FAKE_OBJECT_DIR/immutable-source.tgz"
set +e
python3 "$SCRIPT_DIR/verify-build-provenance.py" "$TMP_DIR/provenance-identity.json" "$TMP_DIR/tampered-provenance.json" >"$TMP_DIR/tampered-source.out" 2>&1; tampered_source=$?
set -e
[[ $tampered_source -ne 0 ]]
mv "$TMP_DIR/browser-source.backup" "$FAKE_OBJECT_DIR/immutable-source.tgz"

# Atomic replacement of the caller receipt during provenance cannot split identities.
race_receipt="$TMP_DIR/race-receipt.json"; cp "$ACTIVE_RECEIPT" "$race_receipt"
python3 - "$race_receipt" "$TMP_DIR/race-replacement.json" <<'PY'
import json,pathlib,sys
v=json.load(open(sys.argv[1])); pathlib.Path(sys.argv[2]).write_text(json.dumps(v,separators=(',',':'))+'\n')
PY
race_original_hash="$(python3 - "$race_receipt" <<'PY'
import hashlib,pathlib,sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())
PY
)"
state="$TMP_DIR/state-receipt-race"; evidence="$TMP_DIR/evidence-receipt-race"; init_state "$state"
export ACTIVE_RECEIPT="$race_receipt" FAKE_STATE_DIR="$state" REPLACE_RECEIPT_TARGET="$race_receipt" REPLACE_RECEIPT_WITH="$TMP_DIR/race-replacement.json" REPLACE_RECEIPT_MARKER="$TMP_DIR/race-replaced"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$race_receipt" --evidence-dir "$evidence" --confirm-no-traffic-deploy >/dev/null
python3 - "$evidence/phase-journal.json" "$evidence/build-receipt.json" "$race_receipt" "$race_original_hash" <<'PY'
import hashlib,json,pathlib,sys
j=json.load(open(sys.argv[1])); snapshot=pathlib.Path(sys.argv[2]).read_bytes(); live=pathlib.Path(sys.argv[3]).read_bytes()
assert hashlib.sha256(snapshot).hexdigest()==sys.argv[4]==j['build_receipt_sha256']; assert hashlib.sha256(live).hexdigest()!=sys.argv[4]
PY
unset REPLACE_RECEIPT_TARGET REPLACE_RECEIPT_WITH REPLACE_RECEIPT_MARKER
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$evidence/build-receipt.json" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null
assert_clean_state "$state"
export ACTIVE_RECEIPT="$TMP_DIR/build.json"

# Review probe: replace evidence/build-receipt.json after the one-time identity was
# derived. Provenance remains bound to the stable identity and the immediate mutation
# check rejects the changed evidence before any Cloud Run update.
python3 - "$ACTIVE_RECEIPT" "$TMP_DIR/receipt-B.json" <<'PY'
import json,pathlib,sys
v=json.load(open(sys.argv[1])); sha='b'*40; stamp=v['created'].replace('-','').replace(':','').lower()
v['source_sha']=sha; v['tag']=f'fullgenome-{sha[:12]}-{stamp}'; v['cloud_run_tag']=f'fg-{sha[:8]}-{stamp}'
for image in v['images'].values(): image['tag']=v['tag']
pathlib.Path(sys.argv[2]).write_text(json.dumps(v,indent=2,sort_keys=True)+'\n')
PY
python3 "$SCRIPT_DIR/release-evidence.py" validate "$TMP_DIR/receipt-B.json" --require-pair >/dev/null
state="$TMP_DIR/state-evidence-race"; evidence="$TMP_DIR/evidence-evidence-race"; init_state "$state"
updates_before="$(grep -c '\[\"run\", \"services\", \"update\"' "$GCLOUD_LOG" || true)"
export FAKE_STATE_DIR="$state" REPLACE_RECEIPT_TARGET="$evidence/build-receipt.json" REPLACE_RECEIPT_WITH="$TMP_DIR/receipt-B.json" REPLACE_RECEIPT_MARKER="$TMP_DIR/evidence-replaced"
set +e
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy >"$TMP_DIR/evidence-race.out" 2>&1
evidence_race=$?
set -e
unset REPLACE_RECEIPT_TARGET REPLACE_RECEIPT_WITH REPLACE_RECEIPT_MARKER
updates_after="$(grep -c '\[\"run\", \"services\", \"update\"' "$GCLOUD_LOG" || true)"
[[ $evidence_race -ne 0 && "$updates_before" == "$updates_after" ]]
grep -q 'receipt evidence changed after identity derivation' "$TMP_DIR/evidence-race.out"
assert_clean_state "$state"

run_failure() {
  local point="$1"; local state="$TMP_DIR/state-$point" evidence="$TMP_DIR/evidence-$point"
  init_state "$state"; export FAKE_STATE_DIR="$state" FAIL_POINT="$point"
  set +e
  "$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy >"$TMP_DIR/$point.out" 2>&1
  local status=$?
  set -e; unset FAIL_POINT
  [[ $status -ne 0 ]]
  python3 - "$evidence/phase-journal.json" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); assert v['status']=='failed_partial'; assert 'rollback_errors' in v
PY
  assert_clean_state "$state"
}
run_failure api_before
run_failure api_after
run_failure browser_before
run_failure browser_after

# A cleaned partial run resumes idempotently from its durable journal.
state="$TMP_DIR/state-browser_before"; evidence="$TMP_DIR/evidence-browser_before"
export FAKE_STATE_DIR="$state"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --resume >/dev/null
[[ "$(python3 "$SCRIPT_DIR/release-evidence.py" get "$evidence/phase-journal.json" status)" == complete ]]
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null
assert_clean_state "$state"

# Deletion failure persists candidate identity; retry cannot silently forget it.
state="$TMP_DIR/state-delete-failure"; evidence="$TMP_DIR/evidence-delete-failure"; init_state "$state"
export FAKE_STATE_DIR="$state"
set +e
FAIL_POINT=browser_after FAIL_DELETE_COMPONENT=browser "$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy >"$TMP_DIR/delete-failure.out" 2>&1
status=$?
set -e
unset FAIL_POINT FAIL_DELETE_COMPONENT
[[ $status -ne 0 ]]
python3 - "$evidence/phase-journal.json" "$state" <<'PY'
import json,pathlib,sys
v=json.load(open(sys.argv[1])); pending=v['services']['browser']['deletion_pending']; assert v['status']=='failed_partial'; assert v['rollback_errors']
assert pending['revision'] and (pathlib.Path(sys.argv[2])/('revision-'+pending['revision']+'.json')).exists()
PY
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null
assert_clean_state "$state"
python3 - "$evidence/phase-journal.json" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); assert v['status']=='cleaned'; assert v['rollback_errors']==[]; assert v['services']['browser']['deletion_state']=='absent'
PY

# Concurrent traffic is never overwritten: cleanup stops without update-traffic.
state="$TMP_DIR/state-concurrent"; evidence="$TMP_DIR/evidence-concurrent"; init_state "$state"
export FAKE_STATE_DIR="$state"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy >/dev/null
python3 - "$state/gnomad-lr-api.json" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]); v=json.loads(p.read_text()); v['status']['traffic'][0]['percent']=90; v['status']['traffic'][1]['percent']=10; p.write_text(json.dumps(v))
PY
set +e
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null 2>&1
concurrent_status=$?
set -e
[[ $concurrent_status -ne 0 ]]
python3 - "$evidence/phase-journal.json" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); assert any('traffic' in x for x in v['rollback_errors'])
PY
if grep -q '"update-traffic"' "$GCLOUD_LOG"; then echo 'cleanup must not restore traffic unconditionally' >&2; exit 1; fi

# Success retains paired identities; repeated --resume is mutation-free; cleanup is idempotent.
state="$TMP_DIR/state-success"; evidence="$TMP_DIR/evidence-success"; init_state "$state"
export FAKE_STATE_DIR="$state"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy >"$TMP_DIR/stage.out"
python3 - "$evidence/deployment-summary.json" "$ACTIVE_RECEIPT" <<'PY'
import hashlib,json,pathlib,sys
v=json.load(open(sys.argv[1])); assert v['status']=='complete'; assert set(v['images'])=={'api','browser'}
assert v['build_receipt_sha256']==hashlib.sha256(pathlib.Path(sys.argv[2]).read_bytes()).hexdigest(); assert not v['traffic_changed_by_command']
PY
before_updates="$(grep -c '"update"' "$GCLOUD_LOG" || true)"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --resume >/dev/null
after_updates="$(grep -c '"update"' "$GCLOUD_LOG" || true)"
[[ "$before_updates" == "$after_updates" ]]

# The Terraform guard rejects a plan timestamp predating deployment evidence.
cat >"$TMP_DIR/bin/terraform" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *'show -json'* ]]; then printf '%s\n' '{"timestamp":"2000-01-01T00:00:00Z","resource_changes":[]}' ; exit 0; fi
echo unexpected-apply >&2; exit 99
EOF
chmod +x "$TMP_DIR/bin/terraform"
: >"$TMP_DIR/plan"
set +e
"$SCRIPT_DIR/terraform-apply-guard.sh" --plan "$TMP_DIR/plan" --deployment-summary "$evidence/deployment-summary.json" --receipt "$ACTIVE_RECEIPT" --confirm-reviewed-apply >"$TMP_DIR/stale.out" 2>&1
stale=$?
set -e
[[ $stale -ne 0 ]]; grep -q 'stale Terraform plan' "$TMP_DIR/stale.out"
python3 - "$LATEST_MARKER" <<'PY'
import json,pathlib,sys
p=pathlib.Path(sys.argv[1]); v=json.loads(p.read_text()); v['completed']='1999-01-01T00:00:00Z'; p.write_text(json.dumps(v))
PY
set +e
"$SCRIPT_DIR/terraform-apply-guard.sh" --plan "$TMP_DIR/plan" --deployment-summary "$evidence/deployment-summary.json" --receipt "$ACTIVE_RECEIPT" --confirm-reviewed-apply >"$TMP_DIR/old-summary.out" 2>&1
old_summary=$?
set -e
[[ $old_summary -ne 0 ]]; grep -q 'not the latest deployment evidence' "$TMP_DIR/old-summary.out"

# Reset a valid latest marker, then replace the caller plan after show. Fake Terraform
# also attempts to substitute the sealed private plan after the final hash but before
# reading it. Apply must consume the reviewed SAFE bytes.
python3 - "$evidence/deployment-summary.json" "$LATEST_MARKER" <<'PY'
import json,pathlib,sys
summary=json.load(open(sys.argv[1])); value={'schema_version':1,'status':'complete','completed':summary['completed'],'build_receipt_sha256':summary['build_receipt_sha256'],'source_sha':summary['source_sha'],'deployment_summary':str(pathlib.Path(sys.argv[1]).resolve())}
pathlib.Path(sys.argv[2]).write_text(json.dumps(value))
PY
cat >"$TMP_DIR/bin/terraform" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *'show -json'* ]]; then printf '%s\n' '{"timestamp":"2999-01-01T00:00:00Z","resource_changes":[]}' ; printf 'EVIL\n' >"$ORIGINAL_PLAN"; exit 0; fi
if [[ "$*" == *' apply '* ]]; then
  plan="${@: -1}"
  if (printf 'EVIL\n' >"${plan}.replacement" && mv "${plan}.replacement" "$plan") 2>/dev/null; then printf replaced >"$PRIVATE_SWAP_RESULT"; else printf blocked >"$PRIVATE_SWAP_RESULT"; fi
  [[ "$(cat "$plan")" == SAFE ]]; [[ "$(stat -f '%Lp' "$plan" 2>/dev/null || stat -c '%a' "$plan")" == 400 ]]
  printf '%s\n' "$plan" >"$APPLY_LOG"; exit 0
fi
exit 99
EOF
chmod +x "$TMP_DIR/bin/terraform"
printf 'SAFE\n' >"$TMP_DIR/swap-plan"
export ORIGINAL_PLAN="$TMP_DIR/swap-plan" APPLY_LOG="$TMP_DIR/applied-plan" PRIVATE_SWAP_RESULT="$TMP_DIR/private-swap-result"
"$SCRIPT_DIR/terraform-apply-guard.sh" --plan "$ORIGINAL_PLAN" --deployment-summary "$evidence/deployment-summary.json" --receipt "$ACTIVE_RECEIPT" --confirm-reviewed-apply >/dev/null
[[ "$(cat "$ORIGINAL_PLAN")" == EVIL && -s "$APPLY_LOG" && "$(cat "$PRIVATE_SWAP_RESULT")" == blocked ]]
unset ORIGINAL_PLAN APPLY_LOG PRIVATE_SWAP_RESULT

# Cleanup is idempotent, proves candidate absence, and invalidates latest evidence.
EXPECT_CLEANUP_MARKER="$LATEST_MARKER" "$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null
assert_clean_state "$state"
"$SCRIPT_DIR/deploy-no-traffic.sh" --receipt "$ACTIVE_RECEIPT" --evidence-dir "$evidence" --confirm-no-traffic-deploy --cleanup >/dev/null
python3 - "$LATEST_MARKER" <<'PY'
import json,sys
v=json.load(open(sys.argv[1])); assert v['status']=='cleaned' and v['cleanup_summary']
PY
set +e
"$SCRIPT_DIR/terraform-apply-guard.sh" --plan "$TMP_DIR/swap-plan" --deployment-summary "$evidence/deployment-summary.json" --receipt "$ACTIVE_RECEIPT" --confirm-reviewed-apply >"$TMP_DIR/cleaned-guard.out" 2>&1
cleaned_guard=$?
set -e
[[ $cleaned_guard -ne 0 ]]; grep -q 'invalidated by cleanup' "$TMP_DIR/cleaned-guard.out"

echo 'verified exact received build bytes, immutable receipt identity, durable build reconciliation, deletion retry, traffic safety, exact Terraform plan apply, and cleanup invalidation offline'
