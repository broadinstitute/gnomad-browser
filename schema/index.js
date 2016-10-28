import {
  GraphQLSchema,
  GraphQLObjectType,
  // GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull,
} from 'graphql'

import GeneType, { geneLookUp } from './types/gene'
import VariantType, { variantLookUp } from './types/variant'

const Schema = (db) => {
  const rootType = new GraphQLObjectType({
    name: 'Root',
    fields: () => ({
      variants: {
        type: new GraphQLList(VariantType),
        resolve: () => variantLookUp(db),
      },
      gene: {
        description: 'Information about a gene',
        type: GeneType,
        args: {
          gene_id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: () => geneLookUp(db),
      },
    }),
  })

  return new GraphQLSchema({ query: rootType })
}

export default Schema
