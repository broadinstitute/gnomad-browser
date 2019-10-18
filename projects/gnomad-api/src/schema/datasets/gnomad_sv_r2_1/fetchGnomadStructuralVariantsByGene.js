import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import rankedSVGeneConsequences from './rankedSVGeneConsequences'

const fetchGnomadStructuralVariantsByGene = async (ctx, { symbol: geneSymbol }, subset = 'all') => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_structural_variants_r2_1',
    type: 'documents',
    size: 10000,
    _source: [
      'chrom',
      'chrom2',
      'consequences',
      'end',
      'end2',
      'filters',
      `freq.${subset}.total`,
      'intergenic',
      'length',
      'pos',
      'pos2',
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
    const variant = hit._source

    let majorConsequence = rankedSVGeneConsequences.find(
      csq => variant.consequences[csq] && variant.consequences[csq].includes(geneSymbol)
    )
    if (!majorConsequence && variant.intergenic) {
      majorConsequence = 'intergenic'
    }

    const freq = variant.freq[subset]

    return {
      ac: freq.total.ac,
      ac_hom: variant.type === 'MCNV' ? null : freq.total.n_homalt,
      an: freq.total.an,
      af: freq.total.af,
      chrom: variant.chrom,
      chrom2: variant.chrom2,
      end: variant.end,
      end2: variant.end2,
      consequence: majorConsequence,
      filters: variant.filters,
      length: variant.length,
      pos: variant.pos,
      pos2: variant.pos2,
      reference_genome: 'GRCh37',
      type: variant.type,
      variant_id: variant.variant_id,
    }
  })
}

export default fetchGnomadStructuralVariantsByGene
