import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'


export const VariantInterface = new GraphQLInterfaceType({
  name: 'Variant',
  fields: {
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
  },
})
