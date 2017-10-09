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

import elasticVariantType, { lookupElasticVariantsByInterval } from './elasticVariant'

import geneType, { lookupGenesByInterval } from './gene'

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    start: { type: GraphQLFloat },
    stop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    xstop: { type: GraphQLFloat },
    chrom: { type: GraphQLInt },
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
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.database.gnomad, 'exome_coverage', obj.xstart, obj.xstop),
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
          const regionRangeQueries = { range: { pos: { gte: obj.start, lte: obj.stop } } }
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
                    interval: 10000,
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
              sort: [{ pos: { order: 'asc' } }],
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
      resolve: (obj, args, ctx) =>
        lookupElasticVariantsByInterval({
          elasticClient: ctx.database.elastic,
          index: 'gnomad',
          dataset: 'exomes',
          intervals: [{ xstart: obj.xstart, xstop: obj.xstop }],
        }),
    },
    gnomadGenomeVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) =>
        lookupElasticVariantsByInterval({
          elasticClient: ctx.database.elastic,
          index: 'gnomad',
          dataset: 'genomes',
          intervals: [{ xstart: obj.xstart, xstop: obj.xstop }],
        }),
    },
    exacv1_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookupVariantsByStartStop(ctx.database.exacv1, 'variants', obj.xstart, obj.xstop),
    },
  }),
})

export default regionType
