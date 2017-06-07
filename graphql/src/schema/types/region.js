/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLFloat,
  // GraphQLString,
} from 'graphql'

import coverageType, { lookupCoverageByStartStop } from './coverage'
import variantType, { lookupVariantsByStartStop } from './variant'

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    xstart: { type: GraphQLFloat },
    xstop: { type: GraphQLFloat },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.database.gnomad, 'exome_coverage', obj.xstart, obj.xstop),
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.database.gnomad, 'genome_coverage', obj.xstart, obj.xstop),
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
