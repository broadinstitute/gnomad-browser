import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import shapeExacVariantSummary from './shapeExacVariantSummary'

const fetchExacVariantsByRegion = async (ctx, { chrom, start, stop }) => {
  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'exac_v1_variants',
    type: 'variant',
    size: 10000,
    _source: [
      'AC_Adj',
      'AC_Hemi',
      'AC_Hom',
      'AN_Adj',
      'alt',
      'chrom',
      'filters',
      'flags',
      'populations',
      'pos',
      'ref',
      'rsid',
      'variant_id',
      'xpos',
    ],
    body: {
      script_fields: {
        csq: {
          script: {
            lang: 'painless',
            inline: 'params._source.sortedTranscriptConsequences?.get(0)',
          },
        },
      },
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            {
              range: {
                pos: {
                  gte: start,
                  lte: stop,
                },
              },
            },
          ],
        },
      },
      sort: [{ pos: { order: 'asc' } }],
    },
  })

  return hits.map(shapeExacVariantSummary('region'))
}

export default fetchExacVariantsByRegion
