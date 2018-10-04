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
  lookupCoverageByIntervals,
  lookupCoverageBuckets,
} from './coverage'

import elasticVariantType, {
  lookupElasticVariantsByInterval,
  lookupElasticVariantsInRegion,
} from './elasticVariant'

import * as fromExacVariant from './exacElasticVariant'

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
  }),
})

export default regionType
