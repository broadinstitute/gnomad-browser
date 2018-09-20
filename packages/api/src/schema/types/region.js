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

// Individual variants can only be returned for regions smaller than this
const FETCH_VARIANTS_REGION_SIZE_LIMIT = 10000

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
        if (obj.regionSize > FETCH_VARIANTS_REGION_SIZE_LIMIT) {
          throw Error(
            `Variants can only be returned by for regions smaller than ${FETCH_VARIANTS_REGION_SIZE_LIMIT} base pairs`
          )
        }

        return lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_exomes_202_37',
          xstart: obj.xstart,
          xstop: obj.xstop,
        })
      },
    },
    gnomadGenomeVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) => {
        if (obj.regionSize > FETCH_VARIANTS_REGION_SIZE_LIMIT) {
          throw Error(
            `Variants can only be returned by for regions smaller than ${FETCH_VARIANTS_REGION_SIZE_LIMIT} base pairs`
          )
        }

        return lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          index: 'gnomad_genomes_202_37',
          xstart: obj.xstart,
          xstop: obj.xstop,
        })
      },
    },
    exacVariants: {
      type: new GraphQLList(elasticVariantType),
      resolve: (obj, args, ctx) => {
        if (obj.regionSize > FETCH_VARIANTS_REGION_SIZE_LIMIT) {
          throw Error(
            `Variants can only be returned by for regions smaller than ${FETCH_VARIANTS_REGION_SIZE_LIMIT} base pairs`
          )
        }

        return fromExacVariant.lookupElasticVariantsInRegion({
          elasticClient: ctx.database.elastic,
          start: obj.start,
          stop: obj.stop,
          chrom: obj.chrom,
        })
      },
    },
  }),
})

export default regionType
