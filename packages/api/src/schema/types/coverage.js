/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLFloat,
} from 'graphql'

// import { List, fromJS } from 'immutable'

import { getXpos } from '@broad/utilities/lib/variant'

const coverageType = new GraphQLObjectType({
  name: 'Coverage',
  fields: () => ({
    // _id: { type: GraphQLString },
    // 10: { type: GraphQLFloat },
    xpos: { type: GraphQLFloat },
    // 15: { type: GraphQLFloat },
    // 25: { type: GraphQLFloat },
    // 30: { type: GraphQLFloat },
    // median: { type: GraphQLFloat },
    pos: { type: GraphQLFloat },
    // 50: { type: GraphQLFloat },
    // 1: { type: GraphQLFloat },
    // 5: { type: GraphQLFloat },
    // 20: { type: GraphQLFloat },
    // 100: { type: GraphQLFloat },
    mean: { type: GraphQLFloat },
  }),
})

const elasticFields = [
  'over50',
  'pos',
  'over20',
  'mean',
  'over10',
  'over15',
  'over5',
  'over1',
  'over25',
  'chrom',
  'median',
  'over30',
  'over100',
]

export default coverageType

export const lookupCoverageByStartStop = (db, collection, xstart, xstop) =>
  db.collection(collection).find({ xpos: { '$gte': Number(xstart), '$lte': Number(xstop) } }).toArray()

export const lookupCoverageByIntervals = ({ elasticClient, index, intervals, chrom, obj }) => {
  const timeStart = new Date().getTime() // NOTE: timer
  const padding = 75
  const regionRangeQueries = intervals.map(({ start, stop }) => (
    { range: { pos: { gte: start - padding, lte: stop + padding } } }
  ))
  const totalBasePairs = intervals.reduce((acc, { start, stop }) =>
    (acc + (stop - start + (padding * 2))), 0)
  const exonsBasePairsSize = intervals.reduce((acc, { start, stop }) =>
    (acc + (stop - start)), 0)
  // console.log('Total base pairs in query', totalBasePairs)

  const fields = [
    'pos',
    'mean',
  ]
  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      type: 'position',
      size: totalBasePairs,
      _source: fields,
      body: {
        query: {
          bool: {
            must: [
              { term: { chrom } },
            ],
            filter: {
              bool: {
                should: regionRangeQueries,
              },
            },
          },
        },
        sort: [{ pos: { order: 'asc' } }],
      },
    }).then((response) => {
      const coverage = response.hits.hits.map((position) => {
        const coverage_position = position._source
        return coverage_position
      })
      const lookupId = obj ? obj.gene_name : `${chrom}-${intervals[0].start}-${intervals[0].stop}`
      const end = new Date().getTime()
      const time = end - timeStart
      console.log(['coverage', index, lookupId , 'exact', 'lookup', exonsBasePairsSize, coverage.length, time].join(','))
      resolve(coverage)
      // return {
        // xpos: getXpos(chrom, coverage_position.pos),
        // ...coverage_position,
      // }
    }).catch(error => {
      console.log(error)
      resolve([])
    })
  })
}

export const lookUpCoverageByExons = ({ elasticClient, index, exons, chrom, obj, ctx }) => {
  const codingRegions = exons.filter(region => region.feature_type === 'CDS')
  // return lookupCoverageByIntervals({ elasticClient, index, intervals: codingRegions, chrom })
  // return lookupCoverageByIntervalsWithBuckets({ elasticClient, index, intervals: codingRegions, chrom })
  return lookupCoverageByIntervalsWithBuckets({
    elasticClient,
    index,
    intervals: codingRegions,
    start: obj.start,
    stop: obj.stop,
    chrom,
    obj,
    ctx,
  })
}

export const lookupCoverageBuckets = ({ elasticClient, index, intervals, chrom }) => {
  const { start, stop } = intervals[0] // HACK
  const intervalSize = Math.floor((stop - start) / 2000)
  const regionRangeQueries = intervals.map(({ start, stop }) => (
    { range: { pos: { gte: start - 100, lte: stop + 100 } } }
  ))
  const totalBasePairs = intervals.reduce((acc, { start, stop }) =>
    (acc + (stop - start)), 0)

  // console.log('Total base pairs in query', totalBasePairs)
  return new Promise((resolve, _) => {
    elasticClient.search({
      index,
      // size: totalBasePairs,
      type: 'position',
      body: {
        query: {
          bool: {
            must: [
              { term: { chrom } },
            ],
            filter: {
              bool: {
                should: regionRangeQueries,
              },
            },
          },
        },
        aggregations: {
          genome_coverage_downsampled: {
            histogram: {
              field: 'pos',
              interval: intervalSize,
            },
            aggregations: {
              bucket_stats: { stats: { field: 'mean' } },
            },
          },
        },
        sort: [{ pos: { order: 'asc' } }],
      },
    }).then((response) => {
      const { buckets } = response.aggregations.genome_coverage_downsampled
      const positions = buckets.map((bucket) => {
        return {
          xpos: getXpos(chrom, bucket.key),
          pos: bucket.key,
          mean: bucket.bucket_stats.avg,
        }
      })
      resolve(positions)
    }).catch(error => {
      console.log(error)
      resolve([])
    })
  })
}

export const lookupCoverageByIntervalsWithBuckets = ({
  elasticClient,
  index,
  intervals,
  chrom,
  start,
  stop,
  ctx,
  obj,
}) => {
  const exonsOnly = true
  const transcriptBasePairsSize = stop - start
  const wholeTranscriptQuery = [{ range: { pos: { gte: start - 100, lte: stop + 100 } } }]

  const exonsBasePairsSize = intervals.reduce((acc, { start, stop }) =>
    (acc + (stop - start)), 0)
  const exonQueries = intervals.map(({ start, stop }) => (
    { range: { pos: { gte: start - 100, lte: stop + 100 } } }
  ))

  // const totalBasePairs = exonsBasePairsSize
  const totalBasePairs = exonsOnly ? exonsBasePairsSize : transcriptBasePairsSize
  const intervalQuery = exonsOnly ? exonQueries : wholeTranscriptQuery

  const EXPECTED_SCREEN_WIDTH = 1000
  const intervalAggregationSize = Math.floor((totalBasePairs) / EXPECTED_SCREEN_WIDTH)

  // console.log('Total transcript base pairs: ', transcriptBasePairsSize)
  // console.log('Total exon base pairs: ', exonsBasePairsSize)
  // console.log('Querying exons only: ', exonsOnly)
  // console.log('Expected screen width: ', EXPECTED_SCREEN_WIDTH)
  // console.log('Interval aggregation size', intervalAggregationSize)

  const cacheKey = `${index}-coverage-${obj.gene_name}`

  if (totalBasePairs < 5000) {
    return lookupCoverageByIntervals({ elasticClient, index, intervals, chrom, obj })
  }

  const timeStart = new Date().getTime() // NOTE: timer

  const fields = [
    'pos',
    'mean',
  ]

  return new Promise((resolve, _) => {
    // console.log('searching')
    // if (totalBasePairs > 150000 && index === 'exacv1_coverage') {
    //   resolve([])
    // }
    return ctx.database.redis.get(cacheKey).then((reply) => {
      if (reply) {
        const end = new Date().getTime()
        const time = end - timeStart
        const coverage = JSON.parse(reply)
        console.log(['coverage', index, obj.gene_name, 'bucket', 'cache', totalBasePairs, coverage.length, time].join(','))
        return resolve(coverage)
      } else {
        elasticClient.search({
          index: obj.gene_name === 'TTN' ? 'exome_coverage' : index, // HACK exacv1 coverage not working for TTN only
          // index,
          type: 'position',
          size: EXPECTED_SCREEN_WIDTH,
          _source: fields,
          body: {
            query: {
              bool: {
                must: [
                  { term: { chrom } },
                ],
                filter: {
                  bool: {
                    should: intervalQuery,
                  },
                },
              },
            },
            aggregations: {
              genome_coverage_downsampled: {
                histogram: {
                  field: 'pos',
                  interval: intervalAggregationSize,
                },
                aggregations: {
                  bucket_stats: { stats: { field: 'mean' } },
                },
              },
            },
            sort: [{ pos: { order: 'asc' } }],
          },
        }).then((response) => {
          const { buckets } = response.aggregations.genome_coverage_downsampled
          const intervalsOnly = buckets.filter(bucket => bucket.bucket_stats.avg !== null).map((bucket) => {
            return {
              xpos: getXpos(chrom, bucket.key),
              pos: bucket.key,
              mean: bucket.bucket_stats.avg,
            }
          })

          return ctx.database.redis.set(cacheKey, JSON.stringify(intervalsOnly)).then(() => {
            const end = new Date().getTime()
            const time = end - timeStart
            console.log(['coverage', index, obj.gene_name, 'bucket', 'lookup', totalBasePairs, intervalsOnly.length, time].join(','))
            return resolve(intervalsOnly)
          })
        }).catch(error => console.log(error))
      }
    }).catch(error => {
      console.log(error)
      resolve([])
    })
  })
}

export const lookUpCoverageByExonsWithBuckets = ({ elasticClient, index, exons, chrom }) => {
  const codingRegions = exons.filter(region => region.feature_type === 'CDS')
  return lookupCoverageByIntervalsWithBuckets({ elasticClient, index, intervals: codingRegions, chrom })
}