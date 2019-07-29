import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import rankedSVGeneConsequences from './rankedSVGeneConsequences'

const fetchGnomadStructuralVariantsByRegion = async (
  ctx,
  { chrom, start, stop, xstart, xstop }
) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_structural_variants_2019_03_13',
    type: 'variant',
    size: 10000,
    _source: [
      'ac.total',
      'af.total',
      'an.total',
      'chrom',
      'consequences',
      'end_chrom',
      'end_pos',
      'filters',
      'intergenic',
      'length',
      'n_homalt.total',
      'pos',
      'type',
      'variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                xpos: {
                  lte: xstop,
                },
              },
            },
            {
              range: {
                end_xpos: {
                  gte: xstart,
                },
              },
            },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  const variants = hits.map(hit => {
    const variant = hit._source // eslint-disable-line no-underscore-dangle

    let majorConsequence = rankedSVGeneConsequences.find(csq => variant.consequences[csq])
    if (!majorConsequence && variant.intergenic) {
      majorConsequence = 'intergenic'
    }

    return {
      ac: variant.ac.total,
      ac_hom: variant.type === 'MCNV' ? null : variant.n_homalt.total,
      an: variant.an.total,
      af: variant.af.total,
      chrom: variant.chrom,
      end_chrom: variant.end_chrom,
      end_pos: variant.end_pos,
      consequence: majorConsequence,
      filters: variant.filters,
      length: variant.length,
      pos: variant.pos,
      type: variant.type,
      variant_id: variant.variant_id,
    }
  })

  return variants.filter(variant => {
    // Only include insertions if the start point falls within the requested region.
    if (variant.type === 'INS') {
      return variant.chrom === chrom && variant.pos >= start && variant.pos <= stop
    }

    // Only include interchromosomal variants (CTX, BNDs, a few INS and CPX) if one of the endpoints
    // falls within the requested region.
    if (variant.type === 'BND' || variant.type === 'CTX' || variant.chrom !== variant.end_chrom) {
      return (
        (variant.chrom === chrom && variant.pos >= start && variant.pos <= stop) ||
        (variant.end_chrom === chrom && variant.end_pos >= start && variant.end_pos <= stop)
      )
    }

    return true
  })
}

export default fetchGnomadStructuralVariantsByRegion
