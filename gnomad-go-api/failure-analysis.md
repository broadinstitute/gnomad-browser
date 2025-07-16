# GraphQL Migration Test Failure Analysis

## Summary
- Total Tests: 50
- Passed: 14 (28.0%)
- Failed: 36 (72.0%)

## Failures by Category
- Copy Number Variants: 2 failures
- Gene Coverage: 4 failures
- Gene Pages: 2 failures
- Region Coverage: 2 failures
- Region Pages: 2 failures
- Short Tandem Repeats: 3 failures
- Structural Variants: 1 failures
- Transcript Coverage: 1 failures
- Transcript Pages: 2 failures
- Variant Pages: 5 failures
- Variant Queries: 3 failures
- Variant Search: 2 failures
- Variants in Region/Gene/Transcript: 7 failures

## GraphQL Validation Errors
These tests fail due to GraphQL schema/query issues:

### Variant not found
Affects 1 test(s):
- copy-number-variant-non-existent

### invalid variant ID format: invalid-variant-id
Affects 1 test(s):
- variant-invalid-format

### the requested element is null which the schema does not allow
Affects 3 test(s):
- variant-page-exac
- variant-page-v2
- variant-page-v4

### unknown dataset: gnomad_r3
Affects 1 test(s):
- gene-coverage-v3

### unsupported dataset: gnomad_r3
Affects 1 test(s):
- variant-page-v3

### variant 1-999999999-A-T not found in dataset gnomad_r4
Affects 1 test(s):
- variant-non-existent

### variant co-occurrence is only available for coding or UTR variants that occur in the same gene
Affects 1 test(s):
- variant-cooccurrence-v2

## Missing Fields
These fields are expected but not present in the response:

### data
- **.data.copy_number_variant.populations: missing in actual** (1 tests)
  - copy-number-variant-page
- **.data.gene.coverage.exome: missing in actual** (1 tests)
  - gene-coverage-v4
- **.data.gene.coverage.genome: missing in actual** (1 tests)
  - gene-coverage-v4
- **.data.gene.gnomad_v2_regional_missense_constraint.has_no_rmc_evidence: missing in actual** (1 tests)
  - gene-page-grch37
- **.data.gene.gnomad_v2_regional_missense_constraint.passed_qc: missing in actual** (1 tests)
  - gene-page-grch37
- **.data.gene.homozygous_variant_cooccurrence_counts: missing in actual** (1 tests)
  - gene-page-grch37
- **.data.gene.variants: missing in actual** (1 tests)
  - variants-in-gene-v4
- **.data.gene: missing in actual** (1 tests)
  - gene-coverage-v3
- **.data.region.coverage.exome: missing in actual** (1 tests)
  - region-coverage-v4
- **.data.region.coverage.genome: missing in actual** (1 tests)
  - region-coverage-v4
- **.data.region.genes: missing in actual** (2 tests)
  - region-page-v2
  - region-page-v4
- **.data.region.structural_variants: missing in actual** (1 tests)
  - structural-variants-in-region-v4
- **.data.region.variants: missing in actual** (3 tests)
  - variants-in-region-v2
  - variants-in-region-v3
  - variants-in-region-v4
- **.data.transcript.clinvar_variants: missing in actual** (1 tests)
  - variants-in-transcript-v4
- **.data.transcript.coverage.exome: missing in actual** (1 tests)
  - transcript-coverage-v4
- **.data.transcript.coverage.genome: missing in actual** (1 tests)
  - transcript-coverage-v4
- **.data.transcript.gene.canonical_transcript_id: missing in actual** (2 tests)
  - transcript-page-v2
  - transcript-page-v4
- **.data.transcript.gene.exons: missing in actual** (2 tests)
  - transcript-page-v2
  - transcript-page-v4
- **.data.transcript.gene.mane_select_transcript: missing in actual** (1 tests)
  - transcript-page-v4
- **.data.transcript.variants: missing in actual** (1 tests)
  - variants-in-transcript-v4
- **.data.variant: missing in actual** (4 tests)
  - variant-page-exac
  - variant-page-v2
  - ... and 2 more
- **.data.variant_cooccurrence: missing in actual** (1 tests)
  - variant-cooccurrence-v2
- **.data.variant_search: missing in actual** (2 tests)
  - variant-search-by-caid
  - variant-search-clinvar

### errors: missing in actual
- **.errors: missing in actual** (5 tests)
  - short-tandem-repeat-non-existent
  - short-tandem-repeat-page
  - ... and 3 more

## Unexpected Fields
These fields are present but not expected:

- **.data.gene: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.mitotip_score: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.mitotip_trna_prediction: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.pon_ml_probability_of_pathogenicity: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.pon_mt_trna_prediction: unexpected in actual** (1 tests)
- **.data.transcript.exac_constraint: unexpected in actual** (1 tests)
- **.errors: unexpected in actual** (6 tests)
- **.errors[0].path: unexpected in actual** (3 tests)

## Recommendations

1. **Fix GraphQL Schema Issues First**

2. **Implement Missing Resolvers**
   Priority fields (affecting most tests):
   - .errors: missing in actual (5 tests)
   - .data.variant: missing in actual (4 tests)
   - .data.region.variants: missing in actual (3 tests)
   - .data.transcript.gene.exons: missing in actual (2 tests)
   - .data.region.genes: missing in actual (2 tests)
   - .data.variant_search: missing in actual (2 tests)
   - .data.transcript.gene.canonical_transcript_id: missing in actual (2 tests)
   - .data.transcript.clinvar_variants: missing in actual (1 tests)
   - .data.region.structural_variants: missing in actual (1 tests)
   - .data.transcript.coverage.genome: missing in actual (1 tests)
