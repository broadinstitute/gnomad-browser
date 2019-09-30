import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import rankedSVGeneConsequences from './rankedSVGeneConsequences'

const fetchGnomadStructuralVariantsByGene = async (ctx, { symbol: geneSymbol }) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_structural_variants',
    type: 'documents',
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
          filter: {
            term: { genes: geneSymbol },
          },
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits.map(hit => {
    const variant = hit._source // eslint-disable-line no-underscore-dangle

    let majorConsequence = rankedSVGeneConsequences.find(
      csq => variant.consequences[csq] && variant.consequences[csq].includes(geneSymbol)
    )
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
      reference_genome: 'GRCh37',
      type: variant.type,
      variant_id: variant.variant_id,
    }
  })
}

export default fetchGnomadStructuralVariantsByGene
