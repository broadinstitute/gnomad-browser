import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import shapeExacVariantSummary from './shapeExacVariantSummary'

const fetchExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'exac_variants',
    type: 'documents',
    size: 10000,
    _source: [
      'AC_Adj',
      'AC_Hemi',
      'AC_Hom',
      'AN_Adj',
      'alleles',
      'filters',
      'locus',
      'populations',
      'rsid',
      'sorted_transcript_consequences',
      'variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': chrom } },
            {
              range: {
                'locus.position': {
                  gte: start,
                  lte: stop,
                },
              },
            },
          ],
        },
      },
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return hits.map(shapeExacVariantSummary({ type: 'region' }))
}

export default fetchExacVariantsByRegion
