import { UserVisibleError } from '../../errors'

const fetchGnomadStructuralVariantDetails = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: 'gnomad_structural_variants_2019_03_13',
    type: 'variant',
    body: {
      query: {
        bool: {
          filter: {
            term: { variant_id: variantId },
          },
        },
      },
    },
  })

  if (response.hits.hits.length === 0) {
    throw new UserVisibleError('Variant not found')
  }

  const variant = response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle

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
}

export default fetchGnomadStructuralVariantDetails
