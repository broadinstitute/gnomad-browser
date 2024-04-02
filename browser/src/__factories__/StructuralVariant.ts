import { Factory } from 'fishery'
import { StructuralVariant } from '../StructuralVariantPage/StructuralVariantPage'

const structuralVariantFactory = Factory.define<StructuralVariant>(
  ({ params, associations, transientParams }) => {
    const {
      algorithms = [],
      alts = null,
      ac = 123,
      an = 345,
      af = 456,
      homozygote_count = null,
      hemizygote_count = null,
      chrom = '21',
      chrom2 = null,
      major_consequence = null,
      copy_numbers = [],
      cpx_intervals = [],
      cpx_type = null,
      end = 456,
      end2 = null,
      evidence = [],
      filters = [],
      genes = [],
      length = 333,
      populations = [],
      pos = 123,
      pos2 = null,
      qual = 99,
      type = 'DUP',
      consequence = null,
      ac_hom = null,
      ac_hemi = null,
    } = params

    const { age_distribution = null, consequences = [], genotype_quality = null } = associations

    const { serialNumber = 999 } = transientParams

    const variant_id = `${type}_${chrom}_${serialNumber}`

    return {
      age_distribution,
      algorithms,
      alts,
      ac,
      an,
      af,
      homozygote_count,
      hemizygote_count,
      major_consequence,
      chrom,
      chrom2,
      consequences,
      copy_numbers,
      cpx_intervals,
      cpx_type,
      end,
      end2,
      evidence,
      filters,
      genes,
      genotype_quality,
      length,
      populations,
      pos,
      pos2,
      qual,
      type,
      variant_id,
      consequence,
      ac_hom,
      ac_hemi,
    }
  }
)

export default structuralVariantFactory
