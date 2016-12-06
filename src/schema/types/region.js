/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  // GraphQLFloat,
  GraphQLList,
  GraphQLInt,
  // GraphQLString,
} from 'graphql'

import coverageType, { lookupCoverageByStartStop } from './coverage'
import variantType, { lookupVariantsByStartStop } from './variant'

const regionType = new GraphQLObjectType({
  name: 'Region',
  fields: () => ({
    xstart: { type: GraphQLInt },
    xstop: { type: GraphQLInt },
    exome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.db, 'exome_coverage', obj.xstart, obj.xstop),
    },
    genome_coverage: {
      type: new GraphQLList(coverageType),
      resolve: (obj, args, ctx) =>
        lookupCoverageByStartStop(ctx.db, 'genome_coverage', obj.xstart, obj.xstop),
    },
    exome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) => {
        console.log('hello!')
        console.log(lookupVariantsByStartStop(ctx.db, 'variants', obj.xstart, obj.xstop))
        return lookupVariantsByStartStop(ctx.db, 'variants', obj.xstart, obj.xstop)
      }

    },
    genome_variants: {
      type: new GraphQLList(variantType),
      resolve: (obj, args, ctx) =>
        lookupVariantsByStartStop(ctx.db, 'gnomadVariants2', obj.xstart, obj.xstop),
    },
  }),
})

export default regionType
