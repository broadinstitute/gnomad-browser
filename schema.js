import {
  GraphQLSchema,
  GraphQLObjectType,
  // GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

const Schema = (db) => {
  const variantType = new GraphQLObjectType({
    name: 'Variant',
    fields: () => ({
      _id: { type: GraphQLString },
      variant_id: { type: GraphQLString },
      allele_freq: { type: GraphQLString },
    }),
  })
  const schema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        variants: {
          type: new GraphQLList(variantType),
          resolve: () => db.collection('variants').find({
            genes: 'ENSG00000184731',
          }, {
            _id: 1,
            variant_id: 1,
            allele_freq: 1,
          }).toArray(),
        },
      }),
    }),
  })
  return schema
}

export default Schema
