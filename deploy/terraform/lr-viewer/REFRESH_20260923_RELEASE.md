# Refreshed 2026-09-23 dataset release

This configuration selects `gnomad_lr_y1_scratch_v6_refresh_20260923_nullable_af`
on `gnomad-lr-refresh20260923-1722` (`192.168.0.2`). It is separate from the old
`full-genome-api-env.json`, retained unchanged for rollback.

## Immutable inputs

`refresh-20260923-artifacts.json` pins the four added configuration artifacts.
`verify-release-config.py` validates both bundles and the exact Docker COPY
allowlist. The primary bundle contains 24 runs per cohort, including AoU chr1 r2.
The primary bundle, represented-length receipt and source-labelled compatibility
receipt are byte-for-byte copies of the previously validated refreshed inputs.
The primary basename is preserved because the represented-length proof binds it.
Normal API startup still reconciles the manifests against physical ClickHouse rows.

The new API must run with `refresh-20260923-api-env.json`, plus
`LR_Y1_CLICKHOUSE_URL` supplied through the exact version of Secret Manager secret
`gnomad-lr-refresh-public-clickhouse-url-20261019`. Do not put the credential URL
in this repository, build arguments, or logs. The reader is SELECT-only on the
required tables/metadata columns and has `readonly=1 CONST`; its host scope is
the existing private Cloud Run subnet plus localhost for verification.

## Available and unavailable modalities

- Refreshed primary variants, frequencies, HGSVC/HPRC carriers/haplotypes and metadata.
- Existing validated coverage, copied to the refreshed VM, for both cohorts.
- Source-labelled methylation from the pinned v3 product, using the refreshed
  primary compatibility receipt; this is NOT VCF-oriented joined methylation.
- Joined methylation is disabled: there is no admitted orientation proof for the
  new VCFs. The local-only assumption is never copied or enabled in production.
- Refreshed STR histogram/context routes are not admitted by this configuration.
  Canonical TR variant pages remain available, but distributions must report
  unavailable, not reuse old histogram data against new primary records.

The cache prefix is unique to this refresh. Generic legacy ClickHouse is disabled.
No production guard, source-data record, run ledger or phasing assertion is changed.

## Deployment boundary

Build the paired API/browser from the exact committed release tree with the
existing immutable `deploy.sh` process. **Do not run `deploy-no-traffic.sh` for
this refresh:** it still selects the old full-genome environment. Stage explicit
no-traffic API and browser revisions with the refresh env/secret reference; point
the browser at the exact new API tag. Keep existing traffic until the candidate
passes actual startup, data and rendered-browser checks. Record env/receipt/digest
and traffic snapshots before and after. Promote exact revisions, not LATEST.

Only after public refreshed-data verification may the old full-genome VM be stopped.
Do not delete its disks or snapshots, and do not stop the separate smaller Y1 VM.
Rollback after stopping the old VM requires starting it and checking ClickHouse
before restoring old browser/API traffic. Old revision tags alone are not a
working rollback while their database VM is stopped.
