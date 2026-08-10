# Immutable full-genome LR release

Image creation, zero-traffic staging, and Terraform administration have separate owners
and evidence. No release command changes serving traffic.

## Offline release gate

```bash
python3 deploy/terraform/lr-viewer/verify-release-config.py
deploy/terraform/lr-viewer/test-deploy-offline.sh
```

The routing manifest pins the exact admitted API artifacts. `full-genome-api-env.json`
is the checked runtime map. Tests use only synthetic local fakes; live validation remains
a separately authorized operation.

## Build/push: immutable source and durable receipts

```bash
deploy/terraform/lr-viewer/deploy.sh \
  --confirm-build-push \
  --receipt /secure/evidence/images.json
```

The script resolves `SOURCE_SHA`, writes one mode-0400 compressed `git archive`, hashes
those exact bytes with SHA-256 and MD5, and uploads them once with a create-only
precondition and service checksum. The script downloads and verifies the resulting exact
GCS generation before any build, derives the Cloud Build configuration from that same
generation, and submits both builds with `source.storageSource.generation` fixed to it.
No mutable local source/config path is submitted or repackaged. Dirty, ignored, secret,
Terraform-variable, local-agent, and generated evidence files cannot enter the archive.
For each build, the receipt records the common resolved bucket/object/generation and
service-reported MD5. Staging downloads that generation again and recomputes both hashes,
proving both builds received the pre-hashed archive bytes. `.gcloudignore` is defense in
depth, not an identity boundary.

An exclusive project build lock prevents overlapping authorized build/reconcile commands.
The receipt is created exclusively and atomically as `in_progress` before the first
remote build. Before each create, it durably records a unique component submission intent.
Cloud Build carries that intent plus generation, component, and image tag in queryable
tags/substitutions. The generation-bound API submitter first reconciles zero or one exact
remote match, rejects ambiguity, then records the build ID as `submitted`; if create
succeeds but that local write fails, resume recovers the original build by intent instead
of creating a duplicate. It advances to `build_succeeded` only after the service reports
success, then transitions through `digest_resolved` and `recorded`.
It becomes `complete` only when the requested set is exact, or `failed_partial` with the
failing phase while retaining every durable transition. Resume a transient post-submit
failure with the same selection, HEAD, and receipt:

```bash
deploy/terraform/lr-viewer/deploy.sh --confirm-build-push --receipt ... --resume
```

Resume reconciles successful build IDs/tags instead of rebuilding them. `--api-only` and
`--browser-only` are mutually exclusive; a no-component success is impossible. Never
delete a partial receipt: it accounts for an otherwise orphaned pushed digest.

Each image records the source SHA, canonical archive SHA-256, routing-manifest SHA-256,
and unique image tag in Cloud Build substitutions/OCI labels. Cloud Build uses digest-
pinned builders and requests verified provenance. pnpm 8.14.3 is downloaded from its
versioned tarball and checked against npm's immutable SHA-512 integrity before offline
installation. The browser build installs no Alpine packages; all base images are digest
pinned.

## Paired no-traffic staging

Only one complete paired receipt is accepted; operators must not retype digests or tags:

```bash
deploy/terraform/lr-viewer/deploy-no-traffic.sh \
  --receipt /secure/evidence/images.json \
  --evidence-dir /secure/evidence/no-traffic \
  --confirm-no-traffic-deploy
```

An exclusive process-wide release lock prevents overlapping authorized staging commands.
At startup, one process parses and hashes the receipt exactly once, snapshots those bytes,
and derives one complete private `release-identity.json`. Provenance and journal evidence
are initialized from that identity rather than reopening the receipt path. Immediately
before every Cloud Run update or revision deletion, staging checks the shell tag/image
inputs and snapshot hash against the identity. Staging verifies:

- exact API/browser Artifact Registry repositories and digests;
- source SHA ↔ image tag ↔ Cloud Run tag and canonical timestamp relationships;
- successful recorded Cloud Build IDs, times, and digest/tag results;
- each resolved Cloud Build source bucket/object/generation, service MD5, and downloaded
  SHA-256 against the pre-hashed archive;
- source/archive/routing-manifest substitutions and required image labels.

`build-provenance.json`, `phase-journal.json`, and `deployment-summary.json` must carry
the same receipt hash and image/build/source identity objects. Service/revision
observations retain the runtime identities. Approval binds to that receipt SHA-256, not
to copied digest text.

The journal is atomically updated before and after every Cloud Run mutation. The API is
staged first; the browser is bound to its tagged URL. Both use `--no-traffic`. Allocated
revision traffic must exactly equal the archived pre-run allocation after every update.
IAM and Terraform are not changed.

### Failure, cleanup, and resume

An error re-describes each service in reverse order, confirms unchanged allocated
traffic, verifies that the run's exact revision has the expected digest and zero traffic,
and persists a `deletion_pending` service/revision/image identity before deletion. It
does **not** issue an unconditional traffic restoration: Cloud Run revision deletion is
used as the atomic safety boundary and must refuse a revision another actor starts
serving. Every attempt separately lists revisions to prove absence and verifies unchanged
allocated traffic and tag absence afterward. Failed deletion retains `deletion_pending`
and errors; a retry falls back to that identity even after the tag disappears.

Every cleanup writes `cleanup-summary.json`. Cleanup is terminal for the staging run and
atomically changes matching `.latest-release-evidence.json` to `cleaned` or
`cleanup_failed`, so cleaned deployment evidence cannot authorize Terraform. Foreign
images, traffic changes, ambiguous tags, failed deletion, or unproved absence stop safely
and remain journaled.

Reconcile without discarding evidence:

```bash
# Continue a partial run (already-correct tagged revisions are reused).
deploy/terraform/lr-viewer/deploy-no-traffic.sh --receipt ... --evidence-dir ... \
  --confirm-no-traffic-deploy --resume

# Remove this run's candidates only; safe to repeat.
deploy/terraform/lr-viewer/deploy-no-traffic.sh --receipt ... --evidence-dir ... \
  --confirm-no-traffic-deploy --cleanup
```

Do not manually empty the evidence directory. A complete `--resume` is a no-op;
`--resume` after cleanup is rejected, while repeated `--cleanup` proves absence again.

## Terraform ownership and stale-plan rejection

The release workflow exclusively owns Cloud Run container image and env fields.
Terraform's two Cloud Run resources enforce that boundary with `lifecycle.ignore_changes`
for those fields; Terraform continues to own scaling, networking, service account,
probes, resources, IAM, and other infrastructure. Digest variables remain bootstrap/
recreation inputs, not an adoption mechanism. Deliberate image/env adoption requires a
separate reviewed change to this ownership rule.

After successful staging, the script atomically updates the ignored local pointer
`.latest-release-evidence.json`. Never apply a saved plan directly. Refresh, create and
review a new plan after the latest deployment summary, then use:

```bash
deploy/terraform/lr-viewer/terraform-apply-guard.sh \
  --plan /secure/evidence/fresh.tfplan \
  --deployment-summary /secure/evidence/no-traffic/deployment-summary.json \
  --receipt /secure/evidence/images.json \
  --confirm-reviewed-apply
```

The guard rejects invalidated cleanup evidence, a plan whose creation timestamp is not
newer than staging, a receipt-hash mismatch, or a Cloud Run diff that attempts a
release-owned image/env change. Under an exclusive apply lock, it copies the caller plan
once into a random private directory, hashes and shows only that copy, then seals the plan
mode 0400 and directory non-writable before the final hash and apply of that same path.
Caller-path replacement and ordinary concurrent private-path substitution cannot change
applied bytes. Repository policy and operator IAM should permit applies only through this
wrapper.

The local concurrency boundary trusts the authorized release user, checked-out scripts,
Python/Terraform/gcloud executables on `PATH`, and the private evidence/temp directories
for one invocation. A deliberately malicious same-UID process that rewrites those trusted
programs or changes directory permissions is outside this workflow's threat model.

## Cutover

These scripts do not cut traffic. Validate both tagged URLs against the release matrix,
retain the evidence directory, obtain approval bound to `build_receipt_sha256`, and use a
separately reviewed traffic procedure. A remaining live validation step is to exercise
build provenance queries, partial-failure rollback, and post-staging service descriptions
in the authorized GCP project before the first production cutover.
