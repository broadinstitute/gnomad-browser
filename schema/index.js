import {
  GraphQLSchema,
  GraphQLObjectType,
  // GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql'

import GeneType, { geneLookUp } from './types/gene'
import VariantType, { lookUpVariantsByGeneId } from './types/variant'

const rootType = new GraphQLObjectType({
  name: 'Root',
  fields: () => ({
    variants: {
      type: new GraphQLList(VariantType),
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        lookUpVariantsByGeneId(ctx.db, args.gene_id),
    },
    gene: {
      description: 'Information about a gene',
      type: GeneType,
      args: {
        gene_id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (obj, args, ctx) =>
        geneLookUp(ctx.db, args.gene_id),
    },
  }),
})

const Schema = new GraphQLSchema({ query: rootType })

export default Schema
