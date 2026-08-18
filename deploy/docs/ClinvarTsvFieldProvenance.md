# ClinVar TSV field provenance

Plan for sourcing the ClinVar ETL from NCBI's tab-delimited exports instead of
`ClinVarVCVRelease_00-latest_weekly.xml.gz`.

Target is the existing Hail schema in `data-pipeline/src/data_pipeline/datasets/clinvar.py:266-291`,
so `prepare_clinvar_variants` and everything downstream stays untouched.

Column numbers are 1-indexed.

## Sources

| alias | file | granularity |
| --- | --- | --- |
| `V` | `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/variant_summary.txt.gz` | one row per (AlleleID, Assembly) |
| `S` | `https://ftp.ncbi.nlm.nih.gov/pub/clinvar/tab_delimited/submission_summary.txt.gz` | one row per SCV |

Join key: `V.VariationID` (c31) = `S.VariationID` (c1)

## Row key — both builds on one row

| target | source | transform |
| --- | --- | --- |
| `locus_GRCh37` | `V` c19 `Chromosome` + `:` + c32 `PositionVCF`, rows where c17 `Assembly` = `GRCh37` | — |
| `alleles_GRCh37` | `V` c33 `ReferenceAlleleVCF`, c34 `AlternateAlleleVCF`, same rows | — |
| `locus_GRCh38` | `V` c19 + `:` + c32, rows where c17 `Assembly` = `GRCh38` | prepend `chr`, `MT` → `M` |
| `alleles_GRCh38` | `V` c33, c34, same rows | — |

Requires pivoting `V` by `Assembly` on `VariationID` — the XML gave both builds on one
record for free. Drop rows where c17 is `na` (9,471) or `NCBI36` (4,771).

## `variant` struct — from `V`

| target | source column | transform |
| --- | --- | --- |
| `clinvar_variation_id` | c31 `VariationID` | — |
| `rsid` | c10 `RS# (dbSNP)` | bare integer; `-` → null |
| `review_status` | c25 `ReviewStatus` | none — vocabulary matches `CLINVAR_GOLD_STARS` verbatim |
| `gold_stars` | derived from c25 | via `CLINVAR_GOLD_STARS` |
| `clinical_significance` | c7 `ClinicalSignificance` | — |
| `last_evaluated` | c9 `LastEvaluated` | `Apr 01, 1981` → `YYYY-MM-DD`; `-` → null |

Germline gate: drop rows where c25 = `-` (equivalently c7 = `-`; exact 490,822-row
correspondence). This reproduces the XML path's `GermlineClassification` requirement.

## `variant.submissions[]` — from `S`, grouped by `VariationID`

| target | source column | transform |
| --- | --- | --- |
| `id` | c11 `SCV` | strip `.N` version suffix to match the XML's bare accession |
| `submitter_name` | c10 `Submitter` | — |
| `clinical_significance` | c2 `ClinicalSignificance` | — |
| `last_evaluated` | c3 `DateLastEvaluated` | same date reformat; `-` → null |
| `review_status` | c7 `ReviewStatus` | — |
| `conditions[].name` | c6 `ReportedPhenotypeInfo` | name half of `CUI:name` |
| `conditions[].medgen_id` | c6 `ReportedPhenotypeInfo` | CUI half; `na` → null |

`ReportedPhenotypeInfo` replaces `_associate_condition_with_medgen_id` and the entire
`find_mapping_elements_by_xref` / `_by_preferred_name` / `_by_name` fallback chain.

## Global

| target | source |
| --- | --- |
| `clinvar_release_date` | **Not present in either TSV.** Open decision: `##fileDate` from `vcf_GRCh38/clinvar.vcf.gz`, the FTP `Last-Modified` header, or an explicit pipeline param. |

Consumed by `deploy/docs/UpdateClinvarVariants.md`, which greps it out of
`globals/parts/part-0` for backup paths and public-bucket release naming.

## Unused by this schema, available if wanted

`V`: c41 `SCVsForAggregateGermlineClassification`, c13 `PhenotypeIDS`, c14 `PhenotypeList`,
c26 `NumberSubmitters`, c35-c40 somatic / oncogenicity.

`S`: c16 `ContributesToAggregateClassification`, c4 `Description`, c8 `CollectionMethod`.

## Verified during investigation

- `V` c25 `ReviewStatus` distinct values are exactly the `CLINVAR_GOLD_STARS` keys plus `-`.
- `V` c25 = `-` and c7 = `-` correspond on exactly 490,822 rows.
- `V` c10 `RS# (dbSNP)` is always a bare integer or `-` — never multi-valued.
- `V` c17 `Assembly`: 4,541,938 GRCh37 / 4,488,630 GRCh38 / 9,471 `na` / 4,771 `NCBI36`.
- `V` c9 `LastEvaluated` is `-` on 566,326 rows, of which 490,822 are the somatic-only rows
  filtered out anyway; `last_evaluated` is already nullable in the XML path and in GraphQL.

## Not verified

- Condition mapping parity: `ReportedPhenotypeInfo` is ClinVar's own mapping, whereas the
  current pipeline computes gnomAD's via `TraitMappingList`. Disagreements are user-visible
  in the submissions table.
- Variant-set parity against the XML path (`ClassifiedRecord` + `SimpleAllele/SequenceLocation`
  gates vs. whatever `variant_summary` includes).
- Effect of the build skew between the two TSVs (observed ~23 hours: `variant_summary`
  2026-08-17 14:51, `submission_summary` 2026-08-16 16:03, XML 2026-08-18 07:43).
