# GraphQL Migration Test Failure Analysis

## Summary
- Total Tests: 2
- Passed: 0 (0.0%)
- Failed: 2 (100.0%)

## Failures by Category
- Variant Pages: 2 failures

## Missing Fields
These fields are expected but not present in the response:

### data
- **.data.variant.caid: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.coverage.exome.mean: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.coverage.exome.over_20: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.coverage.genome.mean: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.coverage.genome.over_20: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.age_distribution.het.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.age_distribution.het.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.age_distribution.hom.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.age_distribution.hom.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.allele_balance.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.allele_balance.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_depth.all.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_depth.all.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_depth.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_depth.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_quality.all.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_quality.all.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_quality.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.exome.quality_metrics.genotype_quality.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.age_distribution.het.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.age_distribution.het.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.age_distribution.hom.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.age_distribution.hom.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.allele_balance.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.allele_balance.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_depth.all.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_depth.all.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_depth.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_depth.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_quality.all.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_quality.all.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_quality.alt.n_larger: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.genome.quality_metrics.genotype_quality.alt.n_smaller: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.joint.faf95: missing in actual** (1 tests)
  - variant-page-v4
- **.data.variant.joint.freq_comparison_stats: missing in actual** (1 tests)
  - variant-page-v4

## Unexpected Fields
These fields are present but not expected:

- **.data.mitochondrial_variant.mitotip_score: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.mitotip_trna_prediction: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.pon_ml_probability_of_pathogenicity: unexpected in actual** (1 tests)
- **.data.mitochondrial_variant.pon_mt_trna_prediction: unexpected in actual** (1 tests)

## Recommendations

2. **Implement Missing Resolvers**
   Priority fields (affecting most tests):
   - .data.variant.coverage.exome.over_20: missing in actual (1 tests)
   - .data.variant.genome.quality_metrics.allele_balance.alt.n_larger: missing in actual (1 tests)
   - .data.variant.joint.freq_comparison_stats: missing in actual (1 tests)
   - .data.variant.exome.quality_metrics.allele_balance.alt.n_larger: missing in actual (1 tests)
   - .data.variant.genome.quality_metrics.allele_balance.alt.n_smaller: missing in actual (1 tests)
   - .data.variant.genome.quality_metrics.genotype_depth.all.n_smaller: missing in actual (1 tests)
   - .data.variant.genome.quality_metrics.genotype_quality.all.n_larger: missing in actual (1 tests)
   - .data.variant.exome.age_distribution.hom.n_larger: missing in actual (1 tests)
   - .data.variant.exome.age_distribution.hom.n_smaller: missing in actual (1 tests)
   - .data.variant.exome.age_distribution.het.n_larger: missing in actual (1 tests)
