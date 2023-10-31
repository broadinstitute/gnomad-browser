import { Factory } from 'fishery'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

const cnvFactory = Factory.define<CopyNumberVariant>(({ params }) => {
  const {
    alts = null,
    sc = 123,
    sn = 345,
    sf = 0.5,
    chrom = '21',
    end = 456,
    filters = [],
    genes = [],
    length = 333,
    populations = [],
    pos = 123,
    qual = 99,
    type = 'DUP',
    posmin = 100121281,
    posmax = 100121284,
    endmin = 100168738,
    endmax = 100168742,
  } = params

  const variant_id = `${chrom}__${type}`

  return {
    alts,
    sc,
    sn,
    sf,
    chrom,
    end,
    filters,
    genes,
    length,
    populations,
    pos,
    qual,
    type,
    posmin,
    posmax,
    endmin,
    endmax,
    variant_id,
  }
})

export default cnvFactory
