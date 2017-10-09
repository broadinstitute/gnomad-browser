/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLFloat,
  GraphQLInt,
  // GraphQLString,
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
