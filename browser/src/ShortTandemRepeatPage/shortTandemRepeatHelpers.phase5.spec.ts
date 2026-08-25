import {
  getSelectedAlleleSizeDistribution,
  getSelectedGenotypeDistribution,
} from './shortTandemRepeatHelpers'

const classicShortRecord: any = {
  associated_diseases: [],
  repeat_units: [
    { repeat_unit: 'CAG', classification: 'pathogenic' },
    { repeat_unit: 'CCG', classification: 'benign' },
  ],
  allele_size_distribution: [
    {
      ancestry_group: 'nfe',
      sex: 'XX',
      repunit: 'CAG',
      quality_description: 'high',
      q_score: '1',
      distribution: [{ repunit_count: 20, frequency: 4 }],
    },
    {
      ancestry_group: 'nfe',
      sex: 'XX',
      repunit: 'CCG',
      quality_description: 'medium',
      q_score: '0.8',
      distribution: [{ repunit_count: 20, frequency: 3 }],
    },
  ],
  genotype_distribution: [
    {
      ancestry_group: 'nfe',
      sex: 'XX',
      short_allele_repunit: 'CAG',
      long_allele_repunit: 'CAG',
      distribution: [
        { short_allele_repunit_count: 19, long_allele_repunit_count: 20, frequency: 2 },
      ],
    },
    {
      ancestry_group: 'nfe',
      sex: 'XX',
      short_allele_repunit: 'CCG',
      long_allele_repunit: 'CCG',
      distribution: [{ short_allele_repunit_count: 7, long_allele_repunit_count: 8, frequency: 1 }],
    },
  ],
}

describe('classic short-page distribution helper compatibility', () => {
  test('preserves repeat-unit classification grouping and quality colors', () => {
    expect(
      getSelectedAlleleSizeDistribution(classicShortRecord, {
        selectedPopulation: null,
        selectedSex: null,
        selectedColorBy: 'quality_description',
        selectedRepeatUnit: 'classification/pathogenic',
      })
    ).toEqual([{ repunit_count: 20, frequency: 4, colorByValue: 'high' }])
  })

  test('preserves exact genotype repeat-unit pair filtering', () => {
    expect(
      getSelectedGenotypeDistribution(classicShortRecord, {
        selectedPopulation: null,
        selectedSex: null,
        selectedRepeatUnits: ['CAG', 'CAG'],
      })
    ).toEqual([{ short_allele_repunit_count: 19, long_allele_repunit_count: 20, frequency: 2 }])
  })
})
