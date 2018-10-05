/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLFloat,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

import { datasetArgumentTypeForMethod } from '../datasets/datasetArgumentTypes'
import datasetsConfig from '../datasets/datasetsConfig'

import coverageType, {
  lookupCoverageByIntervals,
  lookupCoverageBuckets,
} from './coverage'

import elasticVariantType, {
  countVariantsInRegion,
  lookupElasticVariantsInRegion,
} from './elasticVariant'

import * as fromExacVariant from './exacElasticVariant'

import geneType, { lookupGenesByInterval } from './gene'

import { VariantSummaryType } from './variant'

// Individual variants will only be returned if a region has fewer than this many variants
const FETCH_INDIVIDUAL_VARIANTS_LIMIT = 30000

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
      resolve: async (obj, args, ctx) => {
        const queryArgs = {
          elasticClient: ctx.database.elastic,
          index: 'gnomad_exomes_202_37',
          xstart: obj.xstart,
          xstop: obj.xstop,
        }

        const numVariantsInRegion = await countVariantsInRegion(queryArgs)

        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw Error(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }

        return lookupElasticVariantsInRegion(queryArgs)
      },
    },
    gnomadGenomeVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: async (obj, args, ctx) => {
        const queryArgs = {
          elasticClient: ctx.database.elastic,
          index: 'gnomad_genomes_202_37',
          xstart: obj.xstart,
          xstop: obj.xstop,
        }

        const numVariantsInRegion = await countVariantsInRegion(queryArgs)

        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw Error(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }

        return lookupElasticVariantsInRegion(queryArgs)
      },
    },
    exacVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: async (obj, args, ctx) => {
        const queryArgs = {
          elasticClient: ctx.database.elastic,
          start: obj.start,
          stop: obj.stop,
          chrom: obj.chrom,
        }

        const numVariantsInRegion = await fromExacVariant.countExacVariantsInRegion(queryArgs)

        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw Error(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }

        return fromExacVariant.lookupElasticVariantsInRegion(queryArgs)
      },
    },
    variants: {
      type: new GraphQLList(VariantSummaryType),
      args: {
        dataset: { type: datasetArgumentTypeForMethod('fetchVariantsByRegion') },
      },
      resolve: async (obj, args, ctx) => {
        const countVariantsInRegion = datasetsConfig[args.dataset].countVariantsInRegion
        const fetchVariantsByRegion = datasetsConfig[args.dataset].fetchVariantsByRegion

        const numVariantsInRegion = await countVariantsInRegion(ctx, obj)
        if (numVariantsInRegion > FETCH_INDIVIDUAL_VARIANTS_LIMIT) {
          throw Error(
            `Individual variants can only be returned for regions with fewer than ${FETCH_INDIVIDUAL_VARIANTS_LIMIT} variants`
          )
        }
        return fetchVariantsByRegion(ctx, obj)
      },
    },
  }),
})

export default regionType
