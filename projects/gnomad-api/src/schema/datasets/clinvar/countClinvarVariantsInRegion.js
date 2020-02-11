import { xPosition } from '../../../utilities/position'

import getClinvarIndex from './getClinvarIndex'

const countClinvarVariantsInRegion = async (ctx, region) => {
  const index = getClinvarIndex(region.reference_genome)
  const response = await ctx.database.elastic.count({
    index,
    type: 'documents',
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
    },
  })

  return response.count
}

export default countClinvarVariantsInRegion
