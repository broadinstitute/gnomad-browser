import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql'

import geneType, { lookUpGeneByGeneId } from './types/gene'
import variantsType, { lookUpVariantsByGeneId } from './types/variant'
import coverageType, { lookUpCoverageByStartStop } from './types/coverage'

const rootType = new GraphQLObjectType({
  name: 'Root',
  fields: () => ({
    variantsByGeneId: {
      description: 'List of variants and their data',
      type: new GraphQLList(variantsType),
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        lookUpVariantsByGeneId(ctx.db, args.gene_id),
    },
    gene: {
      description: 'Information about a gene',
      type: geneType,
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        lookUpGeneByGeneId(ctx.db, args.gene_id),
    },
    exome_coverage: {
      description: 'Coverage statistics for exomes',
      type: new GraphQLList(coverageType),
      args: {
        start: { type: new GraphQLNonNull(GraphQLInt) },
        stop: { type: new GraphQLNonNull(GraphQLInt) },
      },
      resolve: (obj, args, ctx) =>
        lookUpCoverageByStartStop(ctx.db, 'exome_coverage', args.xstart, args.xstop),
    },
  }),
})

const Schema = new GraphQLSchema({ query: rootType })

export default Schema
