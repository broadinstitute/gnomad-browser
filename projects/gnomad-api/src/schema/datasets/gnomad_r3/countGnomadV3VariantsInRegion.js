import { xPosition } from '../../../utilities/position'

const countGnomadV3VariantsInRegion = async (ctx, { chrom, start, stop }) => {
  const xStart = xPosition(chrom, start)
  const xStop = xPosition(chrom, stop)

  const response = await ctx.database.elastic.count({
    index: 'gnomad_r3_variants',
    type: 'documents',
    body: {
      query: {
        bool: {
          filter: {
            range: {
              xpos: {
                gte: xStart,
                lte: xStop,
              },
            },
          },
        },
      },
    },
  })

  return response.count
}

export default countGnomadV3VariantsInRegion
