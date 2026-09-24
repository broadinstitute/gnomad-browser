# Offline source-context v2.3 candidate projection

**Staged code, not an accepted dataset.** No real capture run, coordinate attestation,
primary snapshot, scientific acceptance, ClickHouse execution or deployment is supplied here.
`candidate.sql` is proposed DDL only. The utility has no network/ClickHouse client.
The v1 exact histogram tables, primary AN, and VCF-derived allele landscape are untouched.

## Files and invariant

- `contract.json`: exact UTF-8 bytes are SHA256-pinned by `projection.rules_sha256`.
- `candidate.sql`: ordinary append-only MergeTree tables; no replacement/dedup engine.
- `generate.ts`: streams captured JSONL to lossless projected JSONL and generates mapping
  rows from an **authoritative, complete canonical target export**.
- `generate.spec.ts`: synthetic offline tests, never evidence for a live dataset.
- Receipt definition/validator: `../../graphql-api/src/str_context_admission.ts`.

One campaign is one cohort, source generation, capture run/task, and selected primary
snapshot. Physical key is `(cohort,run_id,source_uri,source_generation,row_ordinal)`.
Input capture rows must be sorted by the 1-based ordinal, exactly `1..validated_rows`.
This detects every repeated physical key, gap, mixed identity and repeated export row;
there is no `DISTINCT`, `ANY JOIN`, `argMax`, deduplication, or first-row-wins selection.
Logical duplicates on `(cohort,run_id,source_uri,source_generation,locus_id,source_interval,
source_fields.VC)` fail the entire generation, even if every payload byte agrees. Raw
VC `''` and `'.'` are deliberately distinct source spellings, not collapsed to null keys.
Duplicate canonical targets also fail. A failed directory has no `observations.json`
completion marker and must not be imported. The tool will not overwrite/reuse it.

Every captured row and column survives unchanged, including unmatched and ambiguous
rows, header order, summary precision/null spelling, Hemi/Short fields, and raw VC.
Only `projection_version` and `receipt_digest` are added. Capture columns are fixed to
backend `sql/lr_str_source_histograms_v1.sql`; unknown columns fail instead of disappearing.
No original source values are manufactured, reinterpreted, rounded or aggregated.

Canonical target IDs are parsed with the actual `dataset-metadata/longReadTrLocusId.ts`
parser. Targets must already have its canonical spelling. Single-component exact matching
uses cohort/reference/chrom/start/end/literal motif. `N` is literal, not a wildcard;
there is no rotation, reverse-complement, overlap or TRID-split matching. Matching
requires external evidence that source-native coordinates equal canonical start0/end0.
The generator does not establish this evidence or perform POS +/- 1 conversions.

Mapping names match `graphql-api/src/queries/long_read_tr_histograms_v2.ts`:

| Eligible contexts | `mapping_status` | Source pointer |
|---|---|---|
| 0 | `unavailable_no_context` | null |
| 1, single component | `available_source_context` | full source URI/generation/ordinal plus cohort/run |
| >1 | `unavailable_ambiguous` | null, never pick a row |
| compound page | `unavailable_compound` | null; no component selected |

For compounds `component_index=4294967295`, all three named fields are null, and
`context_count=0` means **not evaluated**, not evidence of no source records. The chromosome
is the common chromosome guaranteed by the canonical parser. For single components the
index is 0 and the exact named fields are populated. All mapping rows have
`primary_binding_status=NOT_ESTABLISHED` and `primary_an_concordance=NOT_ESTABLISHED`.
A primary bundle link identifies the snapshot against which associations were computed;
it does not assert identity with a primary genotyped record or AN concordance.

## Prerequisites — independently establish BEFORE running

1. Whole-source backend capture succeeded, with one start and one success terminal receipt,
   full EOF/MD5/size verification, successful worker result and no uncertain transport or
   partial writes. Fence/revoke the exclusive writer; independently reconcile physical
   row count, ordinal coverage, duplicate physical and logical keys, and source identity.
   Raw capture receipts alone are insufficient. Capture histogram validation must have
   checked aggregate/joints/marginals and the safe one-copy-diagonal pair lower bound.
2. Establish GRCh38 and source-coordinate equivalence with an explicit evidence artifact;
   record its SHA256. Public producer code alone does not establish source units/version.
3. Freeze an isolated primary candidate snapshot covering all 24 contigs. Record selected
   runs, manifest digests and accepted-task-attempt digests. Independently export **all**
   canonical target page IDs (not raw per-variant TRIDs, and not a handpicked subset).
   Reconcile export counts/identity against that snapshot, including zero-count contigs.
   A file hash proves byte identity, not completeness or authoritative provenance.
4. Export capture rows with every capture column, JSONEachRow, ORDER BY row_ordinal,
   without LIMIT, region filters, joins or aggregation. Freeze both exports and compute
   their complete-file SHA256s. UInt64 values may be decimal strings; integers above
   JavaScript's safe range fail rather than silently round. No downloaded source TSV is
   parsed by this tool. Header digest is `strContextDigest(source_header)` (ordered JSON array).
   Terminal capture receipt digest is `strContextDigest(capture_receipt)`.
5. Provide an operator-authored manifest of the exact `ProjectionManifest` TypeScript
   shape in `generate.ts`. It contains `database/run_id/cohort/reference_genome`, full
   `source`, `projection`, `primary_snapshot`, backend `capture_receipt`,
   `capture:{database,run_id,parser_version:'updated_histogram_source_v1',header_sha256,receipt_sha256}`,
   and `projection.instance_id` in addition to the projection rules/coordinate fields,
   `exports:{capture_sha256,targets_sha256}`, and
   `evidence:{writer_fence_sha256,worker_success_sha256,primary_export_sha256,source_map_sha256}`,
   and `source_map_artifacts:{sourceMapPath,verificationPath,verificationSha256}` (absolute
   local paths and raw verification-file SHA256; see `str_context_source_map.ts`).
   These evidence digests point to independently reviewed artifacts; their presence is
   NOT offline verification of remote facts. Do not copy the synthetic test manifest.

### Versioned capture/projection namespace separation (v2.3)

`database` is ONLY the fresh projection target. `projection.instance_id` is a new
attempt identity, independent of the capture. The strict accepted form is
`gnomad_lr_y1_scratch_histogram_projection_{cohort}_{projection.instance_id}`.
`capture.database` must be `gnomad_lr_y1_scratch_histogram_{cohort}_{capture.run_id}`.
`run_id` at manifest/receipt/route root MUST equal `capture.run_id`: it always means
the physical capture key. Raw `run_id`, mapping `ancillary_run_id`, and both query
predicates retain that key. Never rename a capture run to fit a new projection DB.
Identifiers have 1–80 lower-case alphanumeric characters separated by single
underscores; `current`/`live` tokens are rejected. Projection DB must differ from
capture DB. A fresh attempt name permits quarantining an uncertain prior attempt;
syntax validation alone cannot prove DB freshness/emptiness or authorize its creation.

For these captures use unchanged `capture.run_id = run_id = refresh_20260923_r1` and
`capture.database = gnomad_lr_y1_scratch_histogram_{cohort}_refresh_20260923_r1`.
One accepted **proposed, not created** projection instance is
`refresh_20260924_prep_1c61785d`, giving:

- `gnomad_lr_y1_scratch_histogram_projection_hgsvc_hprc_refresh_20260924_prep_1c61785d`
- `gnomad_lr_y1_scratch_histogram_projection_aou_refresh_20260924_prep_1c61785d`

Shared pure `str_context_identity.ts` accepts only isolated primary `scratch_v5_*`
and `scratch_v6_*` names (including `gnomad_lr_y1_scratch_v6_refresh_20260923_nullable_af`).
This is name support only: existing primary schema/build, selected 48 cohort/contig
snapshots and accepted attempt gates remain mandatory. Unsupported schema versions
or column types are not admitted by this helper.

The projection rules version is exactly `str-context-v2.3`; old v2.1/v2.2 and unknown
versions fail closed. The completion envelope remains schema 2 with exact new keys:
`capture.database`, `capture.run_id`, and `projection.instance_id`. Both identities
and the new operator-verification raw SHA are bound by the query cache key.

### Original/runtime identity remains unchanged

`str-context-v2.3` retains v2.2's definition of `source.uri/generation/byte_size/md5_base64` as the **logical
original** permanently; `source.runtime_*` is the **sole physical captured object**.
Backend receipts, all capture rows, generated mapping pointers, API preflight, row
validation and exact lookup use one runtime tuple. No OR/fallback selects an original key.
The response's `source_context.source_uri/generation` means physical capture identity,
not logical original provenance. The full receipt retains both distinctly and the cache
binds it (including sourceMap and capture-receipt digests) and verification-file SHA.
All 23 captured columns, source fields, ordered header, and backend terminal receipt remain
unchanged. v1 is untouched; older v2 rules are rejected, not silently reinterpreted or migrated.

Generator and API admission **read** the pinned raw sourceMap artifact and trusted local
operator-verification file. `capture.source_map_sha256` in the operator receipt and
`evidence.source_map_sha256` in the manifest must equal SHA256 of unchanged **raw map
file bytes**, never canonical JSON or an exported per-cohort reserialization. The API
config route supplies `source_map_artifacts` with the same local paths and pinned raw
verification-file SHA; preflight checks them again before database queries. Missing files,
wrong hashes, changed original/runtime roles, mismatched cohort/generation/size/MD5/CRC,
non-equivalent objects or broken capture/evidence linkage fail closed. Direct reads require
an explicit honest original==runtime mapping and direct evidence, never a fallback.

The operator verification is a **trusted external attestation**, not an online GCS check
or signature. The operator must independently verify generation-qualified original/runtime
metadata, create-only copy evidence (or explicit direct read), and the accepted runtime
capture receipt, then pin and protect the local evidence/config files. A hash commits to
bytes; it does not prove GCS metadata, writer revocation, completeness, coordinate semantics,
or operator authority. No GCS/IAM access is added to API runtime. Never construct this
attestation from envelope claims alone or use the synthetic test helper for real data.
v2.3 requires a **new** verification artifact with `schema_version:2` and
`verification_kind:'str_context_source_map_operator_v2'`. Preserve every old sourceMap,
metadata and operator artifact unchanged. Each `captures[]` entry retains the existing
cohort/run/task/receipt hash, expected rows, original/runtime identities, resolved GCS
metadata and read evidence, and adds `database` (the original capture DB) and
`backend_receipt` (the complete unchanged actual backend terminal receipt object).
`receipt_sha256` is `strContextDigest(backend_receipt)`, NOT raw-file SHA. The validator
recomputes it and checks DB/run/task/runtime identity and full success/EOF/row counts;
a correctly shaped digest is no substitute. The new operator artifact's raw SHA256
must be independently trusted in manifest/config. Do not merely relabel a v1 artifact
or use test helpers for a real attestation. No new sourceMap fields are required.
The validator's exported types describe the evidence format. Other evidence digests remain
external prerequisite pointers; this identity correction does not establish their facts.

For the accepted 2026-09-23 captures, originals are generations 1789761285157516 (HGSVC)
and 1790116043533826 (AoU); physical runtime generations are 1790187157452251 and
1790187267088059. Raw sourceMap SHA256 is
`499adbea8e1441ddb07d9918d14220704dcde626a43a8795726a50d4275100d5`.
These are identity facts only: this code package supplies no actual serving
receipt/projection/admission, source units/producer remain
UNKNOWN, and the independent coordinate protocol remains a separate gate.

Each target JSONL object has exactly:

```
canonical_locus_id, cohort, reference_genome,
primary_database, primary_snapshot_digest, primary_run_id
```

All values come from the authoritative export. No primary AN is needed or imported.
Primary bundle digest is canonical sorted-key JSON SHA256 of
`{database,runs: runs.sort((a,b)=>a.chrom.localeCompare(b.chrom))}`, using
`strContextDigest` from the receipt module. Receipt SHA is the same canonical algorithm
on the receipt without its `receipt_digest` field. Rules SHA is **raw file bytes**, not
canonical JSON. These digest conventions must not be interchanged.

## Two offline passes, no receipt fabrication

From the browser repository, with existing dependencies installed:

```sh
pnpm exec ts-node development/str-context-v2/generate.ts \
  /path/operator-manifest.json /path/capture.jsonl /path/canonical-targets.jsonl \
  /path/NEW-unsealed-output
```

This emits `histograms.jsonl`, `mapping.jsonl` and `observations.json` with
`insert_ready:false`, empty row receipt digests, and `scientific_acceptance:false`.
**Never import unsealed rows.** The observation report includes input/source/primary
linkage, all 24 contigs, complete global/per-contig counts, and output-byte SHA256s.
Source/canonical/distinct_context counts conserve all captured rows, not only matched
ones. Mapping counts partition targets into available/absent/ambiguous/compound.
Referenced-source counts count actual unique available pointers. Zero-call sources
remain present; absent mappings are not zero observations. Counts of plot availability
refer to all projected source rows. Fully validated capture has no invalid pairs;
missing/empty/dot pair aggregate is independently unavailable, never a fabricated
zero-size genotype. Pair counts preserve original source encoding; n/n may encode
one or two observed alleles, never inferred diploidy/ploidy/carriers/phasing.

An operator must independently reconcile these observations, prerequisite evidence and
physical candidate state, then author/seal the separate `StrContextReceipt`. The generator
does not generate one or set scientific acceptance. Repeat the exact projection into
a second NEW directory, adding that independently authored receipt:

```sh
pnpm exec ts-node development/str-context-v2/generate.ts \
  /path/operator-manifest.json /path/capture.jsonl /path/canonical-targets.jsonl \
  /path/NEW-sealed-output /path/operator-candidate-receipt.json
```

The receipt validator checks whole identity/primary snapshot/version and conservation;
the generator additionally compares the exact computed global/per-contig counts and
manifest linkage before declaring `insert_ready:true`. Both tables' rows receive the
same receipt digest. The receipt need not contain output file digests (which would make
a circular hash); the unsigned observation report binds the final output file bytes.
`insert_ready` means structurally sealed offline files, **not authorization to import or
proof of scientific acceptance**. No backend/serving receipt is inserted by this tool.

## Later authorized executor — NOT executed here

- Provision only fresh isolated candidate tables from `candidate.sql`, with separately
  approved credentials. Confirm schema and empty state; retain the ordinary MergeTree
  duplicate visibility. Do not change existing v1 tables or a current/production alias.
- After verifying sealed output SHA256s and `observations.json`, import each complete
  file with synchronous `INSERT INTO <candidate>.lr_y1_str_context_histograms_v2 FORMAT
  JSONEachRow` / `...lr_y1_str_context_mapping_v2...` using explicit column contracts.
  This document is not an execution grant. No retry/overwrite/dedup after uncertainty.
- Independently query ALL physical rows after insertion under the writer fence. Compare
  every global/per-contig count, exact source keys, mapping keys, payloads/digests, source
  pointer cardinalities and the currently selected primary bundle. Count logical context
  duplicates using raw map VC, not nullable helper VC. Verify all unselected mappings
  have null pointers, compounds have null named fields, and every selected pointer joins
  exactly one source row. An INSERT acknowledgement alone is not reconciliation.
- Recheck selected primary accepted attempts and evidence; seal/verify the final candidate
  receipt and enable only the explicit v2 candidate receipt/config branch. Parent-owned
  API preflight is required. No legacy position-only fallback, no production traffic,
  no deployment or config activation is included here.

Resource behavior: capture payloads stream; only named-key/context-key indexes, unique
canonical targets and selected references remain in memory (O(rows), not O(total source
payload bytes)). Reserve sufficient memory for whole-source key sets. Current serving
API caps a source response at 200 KiB: the generator rejects oversized projected raw
rows rather than dropping fields; API also bounds expanded response size. Generation
success is not a substitute for later focused candidate API checks of actual responses.

Focused tests: `pnpm exec jest --config development/str-context-v2/jest.config.js --runInBand`.
The repository root Jest projects intentionally do not discover development tests.
