import { fetchAllSearchResults } from '../../../utilities/elasticsearch'

import shapeGnomadV3VariantSummary from './shapeGnomadV3VariantSummary'

const fetchGnomadV3VariantsByRegion = async (ctx, region) => {
  const { chrom, start, stop } = region

  const hits = await fetchAllSearchResults(ctx.database.elastic, {
    index: 'gnomad_r3_variants',
    type: 'documents',
    size: 10000,
    _source: [
      'alleles',
      'filters',
      'freq.adj',
      'lcr',
      'locus',
      'nonpar',
      'rsid',
      'sorted_transcript_consequences',
      'variant_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            { term: { 'locus.contig': `chr${chrom}` } },
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

  return hits.map(shapeGnomadV3VariantSummary({ type: 'region' }))
}

export default fetchGnomadV3VariantsByRegion
