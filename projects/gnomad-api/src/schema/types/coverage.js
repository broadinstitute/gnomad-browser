import { GraphQLFloat, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import { extendRegions, mergeOverlappingRegions, totalRegionSize } from '../../utilities/region'

export const CoverageBinType = new GraphQLObjectType({
  name: 'CoverageBin',
  fields: {
    pos: { type: new GraphQLNonNull(GraphQLFloat) },
    mean: { type: GraphQLFloat },
    median: { type: GraphQLFloat },
    over_1: { type: GraphQLFloat },
    over_5: { type: GraphQLFloat },
    over_10: { type: GraphQLFloat },
    over_15: { type: GraphQLFloat },
    over_20: { type: GraphQLFloat },
    over_25: { type: GraphQLFloat },
    over_30: { type: GraphQLFloat },
    over_50: { type: GraphQLFloat },
    over_100: { type: GraphQLFloat },
  },
})

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
            median: { avg: { field: 'median' } },
            over_1: { avg: { field: 'over1' } },
            over_5: { avg: { field: 'over5' } },
            over_10: { avg: { field: 'over10' } },
            over_15: { avg: { field: 'over15' } },
            over_20: { avg: { field: 'over20' } },
            over_25: { avg: { field: 'over25' } },
            over_30: { avg: { field: 'over30' } },
            over_50: { avg: { field: 'over50' } },
            over_100: { avg: { field: 'over100' } },
          },
        },
      },
    },
  })

  const { buckets } = response.aggregations.downsampled_coverage
  const downsampledCoverage = buckets.map(bucket => ({
    pos: bucket.key,
    mean: bucket.mean.value,
    median: bucket.median.value,
    over_1: bucket.over_1.value,
    over_5: bucket.over_5.value,
    over_10: bucket.over_10.value,
    over_15: bucket.over_15.value,
    over_20: bucket.over_20.value,
    over_25: bucket.over_25.value,
    over_30: bucket.over_30.value,
    over_50: bucket.over_50.value,
    over_100: bucket.over_100.value,
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

export const formatCoverageForCache = coverage =>
  coverage
    .map(bin =>
      [
        bin.pos.toString(),
        Math.ceil(bin.mean || 0).toString(),
        Math.ceil(bin.median || 0).toString(),
        (Math.ceil((bin.over_1 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_5 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_10 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_15 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_20 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_25 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_30 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_50 || 0) * 1000) / 1000).toString(),
        (Math.ceil((bin.over_100 || 0) * 1000) / 1000).toString(),
      ].join(',')
    )
    .join('/')

export const formatCachedCoverage = cachedCoverage =>
  cachedCoverage.split('/').map(bin => {
    const values = bin.split(',').map(Number)
    return {
      pos: values[0],
      mean: values[1],
      median: values[2],
      over_1: values[3],
      over_5: values[4],
      over_10: values[5],
      over_15: values[6],
      over_20: values[7],
      over_25: values[8],
      over_30: values[9],
      over_50: values[10],
      over_100: values[11],
    }
  })
