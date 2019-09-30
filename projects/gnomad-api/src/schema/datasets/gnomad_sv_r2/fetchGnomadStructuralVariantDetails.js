import { UserVisibleError } from '../../errors'

const fetchGnomadStructuralVariantDetails = async (ctx, variantId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'gnomad_structural_variants',
      type: 'documents',
      id: variantId,
    })

    const variant = response._source

    return {
      algorithms: variant.algorithms,
      alts: variant.alts,
      ac: variant.ac.total,
      ac_hom: variant.type === 'MCNV' ? null : variant.n_homalt.total,
      an: variant.an.total,
      chrom: variant.chrom,
      consequences: Object.keys(variant.consequences).map(csq => ({
        consequence: csq,
        genes: variant.consequences[csq],
      })),
      copy_numbers:
        variant.type === 'MCNV'
          ? variant.alts.map((alt, i) => ({
              copy_number: parseInt(alt.slice(4, alt.length - 1), 10),
              ac: variant.mcnv_ac.total[i],
            }))
          : null,
      cpx_intervals: variant.cpx_intervals,
      cpx_type: variant.cpx_type,
      end_chrom: variant.end_chrom,
      end_pos: variant.end_pos,
      evidence: variant.evidence,
      filters: variant.filters,
      genes: variant.genes || [],
      length: variant.length,
      populations: ['afr', 'amr', 'eas', 'eur', 'oth'].map(popId => ({
        id: popId.toUpperCase(),
        ac: variant.ac[popId] || 0,
        an: variant.an[popId] || 0,
        ac_hom: variant.type === 'MCNV' ? null : variant.n_homalt[popId],
      })),
      pos: variant.pos,
      qual: variant.qual,
      type: variant.type,
      variant_id: variant.variant_id,
    }
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('Variant not found')
    }
    throw err
  }
}

export default fetchGnomadStructuralVariantDetails
