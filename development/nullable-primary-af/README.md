# Nullable primary AF reader contract

AF unavailable in source remains `null`; it is never inferred from AC/AN or coerced to zero. Numeric zero is still a supplied frequency. Population divisions with known AC and AN remain present when AF is null; entirely absent divisions are not invented. Physical frequency rows and API population availability are distinct.

## Shared route and count-only views

The shared `variant` route and dedicated LR route both retain nullable source AF with required AC/AN. Both LR population-table callers supply authoritative cohort AC/AN/AF for the Total row; missing or partial subdivisions must not substitute a subtotal for the cohort. Missing supplied totals render unavailable, not zero. Short-read table defaults are unchanged.

Count-only locus stratification accepts known valid counts with null AF, including null aggregate AF. Supplied AF is still checked for finiteness, range and count consistency, using the backend's absolute **5e-6** tolerance for rounded source values (replacing 1e-9). This validates a supplied value; it never derives or replaces AF. At AN0, AC must be zero and supplied AF must be exactly zero (or absent), without division. All-null/invalid counts stay unavailable and unmodified; duplicate/missing ALT observations, inconsistent denominators and cross-ALT sums exceeding AN still reject. The locus response cache namespace is v11 to invalidate old AF-gated count views.

## Startup admission

`graphql-api/src/y1_primary_schema_v5.json` records the eight primary-reader table column contracts from backend f982e6ef278e2373851e8514d0c185cce7851303 checked SQL. Version 6 changes only summary `af` to `Array(Nullable(Float64))` and allele `af` to `Nullable(Float64)`; frequency AF was already nullable. Preflight checks exact column order, names, types and absence of default expressions for these tables. It reads the physical latest-revision `y1_full` receipt, rejecting missing, duplicate, mixed-version, unapplied or wrong-contract receipts:

- v5: `y1_full_v5_single_primary_copy_schema_attestation_not_load_authorization`
- v6: `y1_full_v6_nullable_primary_af_schema_attestation_not_load_authorization`

This is a **reader subset type/receipt check**, not the backend's full 28-table SHOW CREATE attestation, schema source fingerprint, RowBinary hash, transfer acceptance, scientific approval, or write authorization. No existing v5 receipt is relabeled. The old v5 product remains supported with its original nonnullable types/receipt. Nullable v6 must use a distinct `_v6_` database name with no `_v5_` component.

Version 6 additionally requires explicit run-map/manifests and the following paired fields on every manifest entry:

```json
{
  "expected_backend_revision": "<40 lowercase hex characters>",
  "expected_worker_build_version": "gnomad-lr/<same revision>/x86_64-linux-release/features-clickhouse"
}
```

`host-release` is also allowed instead of `x86_64-linux-release`; arbitrary/dirty build strings are not. Every selected run's terminal attempt report (accepted **or failed**) must match its own pair. Different runs may have different pairs. Copied HGSVC retains its original f982 revision/build evidence; it must not be labeled loaded by the nullable worker. Old v5 manifests may omit both fields; if supplied, they are enforced. The existing immutable source/bounds/count/canonical-attempt and metadata checks remain in force. Unselected quarantined run data are neither selected nor queried by these admission checks; do not delete quarantine to satisfy admission.

## Immutable mirror grammar

Legacy sources are unchanged. The only additional root is:

```
gs://gnomad-lr-data/y1/refreshes/[0-9]{8}-[0-9a-f]{12}/sources/
```

The suffix is still exactly `{cohort}/vcfs/gnomAD_LR_Y1.{cohort}.{canonical_chrom}.vcf.gz`; its index is the **same full URI plus `.tbi`**. Generations are separate positive decimal strings. Other buckets, altered cohort/chromosome basenames, traversal/percent encoding, extra segments, queries/fragments and cross-release or legacy/refresh VCF/index pairings fail. URI admission is not source approval or represented-length receipt revalidation; existing length/source receipts must be independently rebound to new bytes.

No live bundles, database schemas, routes, source files or cloud objects are changed by this implementation. Runtime transfer/canary/load and serving cutover require separately verified receipts and authorization.
