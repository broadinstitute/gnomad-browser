# Candidate-only preserved source-labelled methylation

**Candidate compatibility is not serving activation or release approval.** The refreshed
48-primary-run bundle/capture was incomplete at initial implementation. The separately reviewed
2026-09-24 v6 rerun uses actual accepted loading evidence and preserved physical observations;
its dated receipt/results belong in the Flow artifacts, not this template. No live config is
changed by offline generation. `postload-input.INACTIVE.template.json` remains deliberately
incomplete and cannot validate.

## Boundaries

- Old `LR_Y1_SOURCE_PHASED_METHYLATION_ROUTE` is unchanged: immutable v3 serving receipt
  and original bundle SHA `7aee998a…` remain strict. Never fake that hash on the new bundle.
- New `LR_Y1_SOURCE_LABELLED_COMPATIBILITY_ROUTE` requires the literal flag
  `LR_Y1_SOURCE_LABELLED_COMPATIBILITY_CANDIDATE_ENABLED=true`, an isolated
  `gnomad_lr_y1_scratch_v5_*` or `gnomad_lr_y1_scratch_v6_*` DB (not `_current`),
  exact equality to `LR_Y1_CLICKHOUSE_DATABASE`, the actual primary bundle and run map,
  and a byte-hashed `source_labelled_methylation_candidate_compatibility_v1` receipt.
  Routes are mutually exclusive; a configured joined route is rejected with this candidate.
- The new receipt adds facts, never edits the original serving/completion/source identities.
  All 48 primary entries must be selected/accepted with evidence digests; all 24 HGSVC headers
  match the exact **ordered** 292 roster (SHA `297ed617…`). AoU has eight columns, no samples.
  Source availability is the original 231-source subset and 61 without methylation output;
  it is **not** 292 assayed samples and is not a reinterpretation of sample-total status.
- GRCh38 and source-native BED 0-based half-open one-base intervals are independently
  evidenced, not inferred merely from the new VCF header or filename. VCF is 1-based;
  source positions are unchanged. No phase-set, strand, A/B, parental, variant linkage,
  or new orientation claim is accepted. Roster/reference equality cannot prove orientation.
- Only standalone `phased_methylation_capability` / `source_phased_methylation` GraphQL
  queries use this route. No new per-copy UI rendering is enabled. The current unified
  view queries **joined** capability/region separately and requires `AVAILABLE_CONFIRMED`,
  full joined identity and `joinable_to_vcf=true`; its copy/cluster aggregators reject
  null `vcf_strand`. Direct integrity tests exercise that refusal. There is currently no
  standalone source-labelled browser panel: use the explicit raw API, not the A/B view.
- Candidate raw query is HGSVC/HPRC-only, at most 100 kb (inclusive `start..stop` bounds
  on the unchanged native BED `pos1`, not VCF positions), autosomes only. chrX's original
  114-source-sample data remain intact, but the original receipt does not identify those
  114 sample IDs, so **candidate chrX querying is conservatively unavailable** until a
  separate source-contig membership contract exists. chrY has no source data. Empty local
  intervals are sparse observations, not measured zeros/reference calls/full assay coverage.
  Sample-total partial, source-marked-skip and no-assay states remain separate and unchanged.
- Original joined orientation receipt remains unchanged and fails the new primary hash.
  Joined candidate capability remains unavailable pending separate exact-VCF proof/operator
  choice. This must be disclosed at release review; do not silently downgrade public traffic.
  Represented-length binding and context-v2 histograms are separate gates, untouched here.

## Evidence collection and generation — only AFTER primary acceptance

No command below is permission to run startup during the active 32-worker load, to write
ClickHouse, activate a pointer, deploy, or cut over. Collect post-load facts with the parent’s
read budget, verified candidate tunnel/principal, writer fences and accepted immutable sources.
Do not start the whole API as a cheap check: unrelated sample-total preflight groups billions
of rows. The raw runtime preflight is unchanged: exact table schema/constraints/part counts
plus its existing bounded HG00097 chr22 representative query before activating the route.

From the browser worktree (all output destinations must be NEW):

```sh
# 1. After explicit post-load read authorization, verify this endpoint is the CLONE,
# not the public server. Reuse the approved tunnel helper; run it via background_task.
export CH_ENDPOINT=http://127.0.0.1:8128
# CH_USER/CH_PASSWORD if required, never committed. This queries ONLY system tables.
python3 development/source-labelled-methylation/collect-physical.py \
  /POSTLOAD/preserved-source-physical.json

# 2. Prepare the evidence envelopes described below from the actual accepted products.
# Frozen headers can be reused; do not scan genotype data or regenerate old source receipts.
# Do not mechanically set 'accepted' just because a worker exited zero.
cp development/source-labelled-methylation/postload-input.INACTIVE.template.json \
  /POSTLOAD/compatibility-input.json

# 3. OFFLINE: no API/DB client. Validate every local input before creating a new directory.
node_modules/.bin/ts-node --compiler-options '{"module":"commonjs"}' \
  development/source-labelled-methylation/generate.ts \
  /POSTLOAD/compatibility-input.json /POSTLOAD/source-labelled-compatibility-r1

# 4. Verify the receipt's exact bytes; generated route includes this hash.
shasum -a 256 /POSTLOAD/source-labelled-compatibility-r1/compatibility-receipt.json
# candidate-env.INACTIVE.json always has the flag 'false'; do not deploy it as-is.
# Use focused offline tests (no DB startup):
node_modules/.bin/jest --selectProjects graphql-api --runInBand --runTestsByPath \
  graphql-api/src/source_phased_methylation_config.spec.ts \
  graphql-api/src/source_labelled_methylation_compatibility.spec.ts \
  graphql-api/src/joined_phased_methylation_config.spec.ts \
  graphql-api/src/graphql/resolvers/haplotypes.ancillary.spec.ts
node_modules/.bin/jest --selectProjects browser --runInBand --runTestsByPath \
  browser/src/LongReadVariantPage/sourceLabelledMethylationIntegrity.spec.ts
```

Use `background_task` for the bounded collector/test commands when operating through Pi.
A successful offline generator run is compatibility only, not remote revalidation. Preserve the
physical observation timestamp/scope; do not describe reused evidence as a new check.
Hash checks identify bytes; they do not
establish the truth of arbitrary hand-authored evidence. Evidence must come from reviewed
post-load acceptance and bounded metadata; this is mechanical compatibility, not human
orientation approval. Synthetic test envelopes explicitly say synthetic and are never live facts.

### Exact local envelope shapes

All paths in the input/envelopes are absolute. `entries` contains exactly 48 unique cohort/chrom
entries, each `{cohort, chrom, header_evidence_path, acceptance_evidence_path}` matching the
selected bundle. `run_map_path` is the actual JSON object for `LR_Y1_RUN_MAP`.

Each header evidence JSON is:

```json
{
  "source": "REPLACE with exact full entry.source object from frozen source inventory",
  "header_path": "/FROZEN/gnomAD_LR_Y1.hgsvc_hprc.chr1.vcf.gz.header.txt",
  "header_sha256": "REPLACE with verified SHA256 from frozen header evidence"
}
```

`source` is an object, not the placeholder string; it includes URI, generation, MD5, size,
and matching TBI identity. Use the already-frozen source/header inventory to bind it; never
infer that a random local header belongs to a VCF from its filename. The generator matches
this identity to the new bundle, hashes actual header bytes, and compares all ordered samples.

Each acceptance evidence JSON is a **reviewed local envelope**, not a renamed backend receipt:

```json
{
  "database": "ACTUAL_CANDIDATE_DB",
  "cohort": "hgsvc_hprc",
  "chrom": "chr1",
  "run_id": "ACTUAL_ACCEPTED_RUN",
  "manifest_sha256": "ACTUAL_MANIFEST_SHA256",
  "source": "REPLACE with exact full entry.source object",
  "status": "accepted",
  "evidence_files": [{"path": "/POSTLOAD/actual-acceptance-evidence.json", "sha256": "ACTUAL_SHA256"}]
}
```

Review must establish that evidence includes actual terminal/task acceptance, physical
reconciliation, and frozen primary identity for this run. The generator verifies identity,
status and evidence-file bytes; it cannot independently adjudicate remote acceptance.
Never substitute a strict-finalizer workaround or an incomplete capture for accepted primary runs.

The independently grounded native-coordinate evidence JSON is:

```json
{
  "status": "verified",
  "reference_genome": "GRCh38",
  "source_native": "BED_0_BASED_HALF_OPEN_ONE_BASE",
  "primary_native": "VCF_1_BASED",
  "transformation": "none_source_positions_unchanged",
  "primary_bundle_sha256": "ACTUAL_NEW_BUNDLE_BYTE_SHA256",
  "source_manifest_sha256": "cd12abd8ebef56f55d0c18c5d8db60bfe5672869a990c90932168d603cb2da69",
  "evidence_files": [{"path": "/POSTLOAD/reviewed-native-coordinate-evidence.json", "sha256": "ACTUAL_SHA256"}]
}
```

The collector emits `{database,run_id,serving_receipt_sha256,observed_at,endpoint,queries,
 tables,columns,parts}`; generator checks exact source identity, ordinary MergeTree storage,
 required constraints, column types and all 23 partition counts against the old receipt.
Runtime independently rechecks physical state and representative source semantics. No raw
sample scans are needed to derive availability: it uses the unchanged pinned source roster.

## Later isolated candidate exercise (separate authorization)

Mount unchanged original receipt plus the new compatibility receipt; translate paths only,
retain receipt bytes/hash. Use the actual new bundle/map/DB and separately reviewed ancillary
routes. Leave old raw/joined env vars empty, opt in only inside the isolated candidate, and
schedule full API preflight after load. Do not share candidate/public response-cache namespaces
or reuse an old joined-capability response. A flag is not public-release permission.

```graphql
query {
  phased_methylation_capability(lr_cohort: hgsvc_hprc) {
    available joinable_to_vcf status orientation_status phase_set_semantics reason
  }
  source_phased_methylation(chrom: "chr22", start: 47040000, stop: 47050000,
    sample_id: "HG00097", lr_cohort: hgsvc_hprc) {
    chr pos1 pos2 sample methylation coverage data_layer source_haplotype vcf_strand phase_set
  }
  joined_phased_methylation_capability(chrom: "chr22", lr_cohort: hgsvc_hprc) {
    available status reason
  }
}
```

Expect raw HAP1/HAP2 with **null** strand/phase set, `joinable_to_vcf=false`, joined unavailable;
AoU unavailable; source-absent HG00096 rejected, X/Y rejected, no A/B tracks. Any joined
availability on the new candidate is a stop condition, not successful compatibility.
