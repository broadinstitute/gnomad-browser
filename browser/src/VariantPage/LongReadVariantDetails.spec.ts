import { describe, expect, test } from '@jest/globals'

import { getAllelicSeriesDistribution, selectGenotypeDistribution } from './LongReadVariantDetails'

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

describe('getAllelicSeriesDistribution', () => {
  test('uses ancestry ACs without double-counting cohort AC', () => {
    expect(
      getAllelicSeriesDistribution([
        {
          variant_id: 'chr22-100-TRV-4~1',
          length: -1,
          ac: 10,
          an: 100,
          af: 0.1,
          populations: [
            { id: 'afr', ac: 3, an: 40, af: 0.075 },
            { id: 'nfe', ac: 7, an: 60, af: 0.117 },
          ],
        },
      ])
    ).toEqual([
      { length_diff: -1, pop: 'AFR', count: 3 },
      { length_diff: -1, pop: 'EUR', count: 7 },
    ])
  })

  test('omits alleles whose length is unavailable', () => {
    expect(
      getAllelicSeriesDistribution([
        {
          variant_id: 'chr22-100-TRV-4~1',
          length: null,
          ac: 10,
          an: 100,
          af: 0.1,
          populations: [],
        },
      ])
    ).toEqual([])
  })
})

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
