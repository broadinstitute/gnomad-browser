import { fetchAllSearchResults } from '../../../utilities/elasticsearch'
import { xPosition } from '../../../utilities/position'

import getClinvarIndex from './getClinvarIndex'
import shapeClinvarVariant from './shapeClinvarVariant'

const fetchClinvarVariantsByRegion = async (ctx, region) => {
  const index = getClinvarIndex(region.reference_genome)
  const results = await fetchAllSearchResults(ctx.database.elastic, {
    index,
    type: 'documents',
    size: 10000,
    body: {
      query: {
        bool: {
          filter: {
            range: {
              xpos: {
                gte: xPosition(region.chrom, region.start),
                lte: xPosition(region.chrom, region.stop),
              },
            },
          },
        },
      },
      sort: [{ 'locus.position': { order: 'asc' } }],
    },
  })

  return results.map(
    shapeClinvarVariant({ type: 'region', referenceGenome: region.reference_genome })
  )
}

export default fetchClinvarVariantsByRegion
