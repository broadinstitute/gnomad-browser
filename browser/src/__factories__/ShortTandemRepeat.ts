import { Factory } from 'fishery'
import { ShortTandemRepeat } from '../ShortTandemRepeatPage/ShortTandemRepeatPage'

const shortTandemRepeatFactory = Factory.define<ShortTandemRepeat>(({ params, associations }) => {
  const {
    id = 'STR1',

    reference_repeat_unit = 'CTG',
    repeat_units = [],
    stripy_id = 'STR1',
    adjacent_repeats = [],
  } = params

  const {
    gene = { ensembl_id: 'ENSG00000000001', symbol: 'ABCD1', region: 'coding:polyglutamine' },
    associated_diseases = [
      {
        name: 'disease',
        symbol: 'abcd1',
        omim_id: '123456',
        inheritance_mode: 'Autosomal dominant',
        repeat_size_classifications: [
          { classification: 'Normal', max: 32, min: null },
          { classification: 'Intermediate', max: 38, min: 36 },
          { classification: 'Pathogenic', max: null, min: 39 },
        ],
        notes: 'hello world',
      },
    ],
    main_reference_region = { chrom: '1', start: 10000000, stop: 15000000 },
    reference_regions = [{ chrom: '1', start: 10000000, stop: 15000000 }],
    allele_size_distribution = [
      {
        ancestry_group: 'asj',
        sex: 'XY',
        repunit: 'ACCA',
        quality_description: 'medium-low',
        q_score: '0.6',
        distribution: [
          { repunit_count: 3, frequency: 12, colorByValue: 'low' },
          { repunit_count: 4, frequency: 123, colorByValue: 'high' },
        ],
      },
    ],
    genotype_distribution = [
      {
        ancestry_group: 'asj',
        sex: 'XY',
        short_allele_repunit: 'ACCA',
        long_allele_repunit: 'GATA',
        quality_description: 'high',
        q_score: '1',
        distribution: [
          { short_allele_repunit_count: 8, long_allele_repunit_count: 9, frequency: 15 },
          { short_allele_repunit_count: 8, long_allele_repunit_count: 10, frequency: 19 },
          { short_allele_repunit_count: 9, long_allele_repunit_count: 10, frequency: 17 },
        ],
      },
    ],
    age_distribution = [
      {
        age_range: [null, 18],
        distribution: [
          [8, 6],
          [9, 3],
          [10, 9],
        ],
      },
    ],
  } = associations

  return {
    id,
    gene,
    associated_diseases,
    main_reference_region,
    reference_regions,
    reference_repeat_unit,
    repeat_units,
    allele_size_distribution,
    genotype_distribution,
    age_distribution,
    stripy_id,
    adjacent_repeats,
  }
})

export default shortTandemRepeatFactory
