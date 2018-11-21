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
    ex_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: datasetArgumentTypeForMethod('fetchExomeCoverageByRegion') },
      },
      resolve: (obj, args, ctx) => {
        const fetchExomeCoverageByRegion = datasetsConfig[args.dataset].fetchExomeCoverageByRegion
        return fetchExomeCoverageByRegion(ctx, obj)
      },
    },
    ge_coverage: {
      type: new GraphQLList(coverageType),
      args: {
        dataset: { type: datasetArgumentTypeForMethod('fetchGenomeCoverageByRegion') },
      },
      resolve: (obj, args, ctx) => {
        const fetchGenomeCoverageByRegion = datasetsConfig[args.dataset].fetchGenomeCoverageByRegion
        return fetchGenomeCoverageByRegion(ctx, obj)
      },
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
