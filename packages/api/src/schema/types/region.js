/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

import coverageType, {
  lookupCoverageByStartStop,
  lookupCoverageByIntervals,
  lookupCoverageBuckets,
} from './coverage'

import variantType, { lookupVariantsByStartStop } from './variant'

import elasticVariantType, {
  lookupElasticVariantsByInterval,
  lookupElasticVariantsInRegion,
} from './elasticVariant'

import * as fromExacVariant from './exacElasticVariant'

import {
  schizophreniaGwasVariants,
  schizophreniaExomeVariantsInRegion,
} from './schzvariant'

import geneType, { lookupGenesByInterval } from './gene'

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    start: { type: GraphQLFloat },
    stop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    xstop: { type: GraphQLFloat },
    chrom: { type: GraphQLString },
    regionSize: { type: GraphQLInt },
    genes: {
      type: new GraphQLList(geneType),
      resolve: (obj, args, ctx) => lookupGenesByInterval({
        mongoDatabase: ctx.database.gnomad,
        xstart: obj.xstart,
        xstop: obj.xstop,
      })
    },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        if ((obj.stop - obj.start) > 1600) {
          return lookupCoverageBuckets({
            elasticClient: ctx.database.elastic,
            index: 'exome_coverage',
            intervals: [{ start: obj.start, stop: obj.stop }],
            chrom: obj.chrom,
          })
        }
        return lookupCoverageByIntervals({
          elasticClient: ctx.database.elastic,
          index: 'exome_coverage',
          intervals: [{ start: obj.start, stop: obj.stop }],
          chrom: obj.chrom,
        })
      }
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        if ((obj.stop - obj.start) > 1600) {
          return lookupCoverageBuckets({
            elasticClient: ctx.database.elastic,
            index: 'genome_coverage',
            intervals: [{ start: obj.start, stop: obj.stop }],
            chrom: obj.chrom,
          })
        }
        return lookupCoverageByIntervals({
          elasticClient: ctx.database.elastic,
          index: 'genome_coverage',
          intervals: [{ start: obj.start, stop: obj.stop }],
          chrom: obj.chrom,
        })
      }
    },
    exacv1_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) => {
        if ((obj.stop - obj.start) > 1600) {
          return lookupCoverageBuckets({
            elasticClient: ctx.database.elastic,
            index: 'exacv1_coverage',
            intervals: [{ start: obj.start, stop: obj.stop }],
            chrom: obj.chrom,
          })
        }
        return lookupCoverageByIntervals({
          elasticClient: ctx.database.elastic,
          index: 'exacv1_coverage',
          intervals: [{ start: obj.start, stop: obj.stop }],
          chrom: obj.chrom,
        })
      }
    },
    gnomad_consequence_buckets: {
      type: new GraphQLObjectType({
        name: 'buckets',
        fields: () => ({
          total_consequence_counts: {
            type: new GraphQLList(new GraphQLObjectType({
              name: 'total_consequence_counts',
              fields: () => ({
                consequence: { type: GraphQLString },
                count: { type: GraphQLInt },
              })
            }))
          },
          buckets: {
            type: new GraphQLList(new GraphQLObjectType({
              name: 'bucket',
              fields: () => ({
                // xpos: { type: GraphQLFloat },
                pos: { type: GraphQLFloat },
                // total: { type: GraphQLInt },
                bucket_consequence_counts: {
                  type: new GraphQLList(new GraphQLObjectType({
                    name: 'consequence_count',
                    fields: () => ({
                      consequence: { type: GraphQLString },
                      count: { type: GraphQLInt },
                    }),
                  }))
                }
              })
            }))
          }
        })
      }),
      resolve: (obj, args, ctx) => {
        return new Promise((resolve, reject) => {
          const regionRangeQueries = { range: { xpos: { gte: obj.xstart, lte: obj.xstop } } }
          // NOTE: divide region size by the number of buckets you want
          const numberOfBuckets = 100
          let intervalSize
          if (obj.xstop - obj.xstart < 100) {
            intervalSize = 1
          } else {
            intervalSize = Math.floor((obj.xstop - obj.xstart) / numberOfBuckets)
          }

          ctx.database.elastic.search({
            index: 'gnomad',
            type: 'variant',
            body: {
              query: {
                bool: {
                  filter: {
                    bool: {
                      should: regionRangeQueries,
                    },
                  },
                },
              },
              aggregations: {
                total_consequence_counts: {
                  terms: {
                    field: 'majorConsequence',
                  },
                },
                bucket_positions: {
                  histogram: {
                    field: 'pos',
                    interval: intervalSize,
                  },
                  aggregations: {
                    bucket_consequence_counts: {
                      terms: {
                        field: 'majorConsequence',
                      },
                    },
                  },
                },
              },
              sort: [{ xpos: { order: 'asc' } }],
            },
          }).then((response) => {
            const { buckets } = response.aggregations.bucket_positions
            const { total_consequence_counts } = response.aggregations
            const data = {
              total_consequence_counts: total_consequence_counts.buckets.map(consequence => ({
                consequence: consequence.key,
                count: consequence.doc_count,
              })),
              buckets: buckets.map(bucket => ({
                pos: bucket.key,
                bucket_consequence_counts: bucket.bucket_consequence_counts.buckets.map((consequence) => {
                  return {
                    consequence: consequence.key,
                    count: consequence.doc_count,
                  }
                })
              }))
            }
            resolve(data)
          })
        })
      }
    },
    gnomadExomeVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) => {
        console.log(obj.regionSize)
        if (obj.regionSize < 10000) {
          return lookupElasticVariantsInRegion({
            elasticClient: ctx.database.elastic,
            index: 'gnomad_exomes_202_37',
            dataset: 'exomes',
            xstart: obj.xstart,
            xstop: obj.xstop,
            numberOfVariants: 5000,
          })
        }
        return lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_exomes_202_37',
          dataset: 'exomes',
          xstart: obj.xstart,
          xstop: obj.xstop,
          numberOfVariants: 5000,
        })
      }
    },
    gnomadGenomeVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) => {
        console.log(obj.regionSize)
        if (obj.regionSize < 10000) {
          return lookupElasticVariantsInRegion({
            elasticClient: ctx.database.elastic,
            index: 'gnomad_genomes_202_37',
            dataset: 'genomes',
            xstart: obj.xstart,
            xstop: obj.xstop,
            numberOfVariants: 5000,
          })
        }
        return lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_genomes_202_37',
          dataset: 'genomes',
          xstart: obj.xstart,
          xstop: obj.xstop,
          numberOfVariants: 5000,
        })
      }
    },
    exacVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) => {
        console.log(obj.regionSize)
        if (obj.regionSize < 10000) {
          return fromExacVariant.lookupElasticVariantsInRegion({
            elasticClient: ctx.database.elastic,
            start: obj.start,
            stop: obj.stop,
            chrom: obj.chrom,
            numberOfVariants: 5000,
          })
        }
        return fromExacVariant.lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          start: obj.start,
          stop: obj.stop,
          chrom: obj.chrom,
          numberOfVariants: 5000,
        })
      }
    },
    schizophreniaGwasVariants,
    schizophreniaExomeVariants: schizophreniaExomeVariantsInRegion,
  }),
})

export default regionType
