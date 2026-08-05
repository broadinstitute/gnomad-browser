# Immutable full-genome LR release

This directory separates image creation from Cloud Run staging. Neither script applies
Terraform or changes traffic.

## Checked release inputs

- `graphql-api/config/full-genome-routing-artifact-manifest.json` pins the exact eight
  API routing/admission artifacts by repository path, image path, byte count, and
  SHA-256.
- `full-genome-api-env.json` is the exact API runtime map. ClickHouse uses
  `192.168.0.124:8123`; Redis remains on `192.168.0.6:6379`.
- `verify-release-config.py` checks artifact hashes, the exact Docker build allowlist,
  browser compile-time Y1 input, immutable image handling, and endpoint separation.

Run the offline check before any authorized release work:

```bash
python3 deploy/terraform/lr-viewer/verify-release-config.py
```

## Authorized build/push phase

From a clean committed worktree:

```bash
deploy/terraform/lr-viewer/deploy.sh \
  --confirm-build-push \
  --receipt /secure/evidence/images.json
```

The script creates one unique `fullgenome-<12sha>-<UTC>` tag per component, embeds
OCI source/routing labels, requests Cloud Build verified provenance, resolves each
pushed digest, and writes an image receipt. It never writes `:latest`.

## Authorized tagged no-traffic phase

After separately approving the resolved digests:

```bash
deploy/terraform/lr-viewer/deploy-no-traffic.sh \
  --api-digest sha256:... \
  --browser-digest sha256:... \
  --tag fullgenome-<12sha>-<UTC> \
  --evidence-dir /secure/evidence/no-traffic \
  --confirm-no-traffic-deploy
```

The script archives both live service descriptions before mutation, stages the API by
digest with the exact checked env, discovers its tagged URL, stages the browser by
digest against that URL, and archives both resulting descriptions. Both updates use
`--no-traffic`; IAM, networking, resources, old revisions, and public traffic are left
alone.

Do not cut traffic in either script. Validate the tagged URLs against the release
validation matrix first and obtain separate cutover approval.

## Terraform source of truth

Terraform now requires explicit API/browser image digests and consumes the same exact
API env file, so a future reviewed plan will not silently resolve `:latest` or restore
the old ClickHouse endpoint. The no-traffic release path intentionally patches the
existing Cloud Run services instead of applying this broader Terraform stack. Any
future Terraform apply must be based on fresh state and a separately reviewed plan.
