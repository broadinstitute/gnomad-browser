import { GraphQLFloat, GraphQLObjectType } from 'graphql'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from '../../utilities/region'

const coverageType = new GraphQLObjectType({
  name: 'Coverage',
  fields: {
    pos: { type: GraphQLFloat },
    mean: { type: GraphQLFloat },
  },
})

export default coverageType

const fetchCoverage = async (ctx, { index, type = 'position', chrom, regions, bucketSize }) => {
  const response = await ctx.database.elastic.search({
    index,
    type,
    size: 0,
    _source: ['pos', 'mean'],
    body: {
      query: {
        bool: {
          filter: [
            { term: { chrom } },
            {
              bool: {
                should: regions.map(({ start, stop }) => ({
                  range: { pos: { gte: start, lte: stop } },
                })),
              },
            },
          ],
        },
      },
      aggregations: {
        downsampled_coverage: {
          histogram: {
            field: 'pos',
            interval: bucketSize,
          },
          aggregations: {
            mean: { avg: { field: 'mean' } },
          },
        },
      },
    },
  })

  const { buckets } = response.aggregations.downsampled_coverage
  const downsampledCoverage = buckets.map(bucket => ({
    pos: bucket.key,
    mean: bucket.mean.value,
  }))

  return downsampledCoverage
}

export const fetchCoverageByTranscript = async (ctx, { index, type, chrom, exons }) => {
  const paddedExons = extendRegions(75, exons)
  const mergedExons = mergeOverlappingRegions(paddedExons.sort((a, b) => a.start - b.start))
  const totalIntervalSize = totalRegionSize(mergedExons)
  const bucketSize = totalIntervalSize < 5000 ? 1 : Math.floor(totalIntervalSize / 1000)
  return fetchCoverage(ctx, {
    index,
    type,
    chrom,
    regions: mergedExons,
    bucketSize,
  })
}

export const fetchCoverageByRegion = (ctx, { index, type, region }) => {
  const { chrom, start, stop } = region
  const regionSize = stop - start + 150
  const bucketSize = Math.max(1, Math.floor(regionSize / 2000))
  return fetchCoverage(ctx, {
    index,
    type,
    chrom,
    regions: [{ start: start - 75, stop: stop + 75 }],
    bucketSize,
  })
}
