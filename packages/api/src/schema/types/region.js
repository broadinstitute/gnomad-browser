/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLFloat,
  GraphQLInt,
  // GraphQLString,
} from 'graphql'

import coverageType, { lookupCoverageByStartStop, lookupCoverageByIntervals } from './coverage'
import variantType, { lookupVariantsByStartStop } from './variant'

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    start: { type: GraphQLFloat },
    stop: { type: GraphQLFloat },
    xstart: { type: GraphQLFloat },
    xstop: { type: GraphQLFloat },
    chrom: { type: GraphQLInt },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.database.gnomad, 'exome_coverage', obj.xstart, obj.xstop),
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
      lookupCoverageByIntervals({
        elasticClient: ctx.database.elastic,
        index: 'genome_coverage',
        intervals: [{ start: obj.start, stop: obj.stop }],
        chrom: obj.chrom,
      }),
    },
    exome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) => {
        console.log(lookupVariantsByStartStop(ctx.database.gnomad, 'exome_variants', obj.xstart, obj.xstop))
        return lookupVariantsByStartStop(ctx.database.gnomad, 'exome_variants', obj.xstart, obj.xstop)
      },
    },
    genome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookupVariantsByStartStop(ctx.database.gnomad, 'genome_variants', obj.xstart, obj.xstop),
    },
    exacv1_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookupVariantsByStartStop(ctx.database.exacv1, 'variants', obj.xstart, obj.xstop),
    },
  }),
})

export default regionType
