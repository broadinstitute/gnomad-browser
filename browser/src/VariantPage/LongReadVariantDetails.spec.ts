import { describe, expect, test } from '@jest/globals'

import { selectGenotypeDistribution } from './LongReadVariantDetails'

const cohorts = [
  {
    ancestry_group: 'afr',
    sex: 'XX' as const,
    short_allele_repunit: '',
    long_allele_repunit: '',
    distribution: [{ short_allele_repunit_count: 10, long_allele_repunit_count: 12, frequency: 2 }],
  },
  {
    ancestry_group: 'nfe',
    sex: 'XY' as const,
    short_allele_repunit: '',
    long_allele_repunit: '',
    distribution: [{ short_allele_repunit_count: 11, long_allele_repunit_count: 14, frequency: 3 }],
  },
]

describe('selectGenotypeDistribution', () => {
  test('combines all cohorts when no filters are selected', () => {
    expect(selectGenotypeDistribution(cohorts, null, null)).toEqual([
      { short_allele_repunit_count: 10, long_allele_repunit_count: 12, frequency: 2 },
      { short_allele_repunit_count: 11, long_allele_repunit_count: 14, frequency: 3 },
    ])
  })

  test('filters cohorts by ancestry group and sex', () => {
    expect(selectGenotypeDistribution(cohorts, 'nfe', 'XY')).toEqual([
      { short_allele_repunit_count: 11, long_allele_repunit_count: 14, frequency: 3 },
    ])
  })
})
