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
    reference_region = { chrom: '1', start: 10000000, stop: 15000000 },
    allele_size_distribution = {
      distribution: [[1, 1]],
      populations: [],
      repeat_units: [],
    },
    genotype_distribution = { distribution: [], populations: [], repeat_units: [] },
  } = associations

  return {
    id,
    gene,
    associated_diseases,
    reference_region,
    reference_repeat_unit,
    repeat_units,
    allele_size_distribution,
    genotype_distribution,
    stripy_id,
    adjacent_repeats,
  }
})

export default shortTandemRepeatFactory
