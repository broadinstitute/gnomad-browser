import {
  GraphQLObjectType,
  // GraphQLInt,
  GraphQLString,
  GraphQLList,
} from 'graphql'

const variantType = new GraphQLObjectType({
  name: 'Variant',
  fields: () => ({
    _id: { type: GraphQLString },
    variant_id: { type: GraphQLString },
    allele_freq: { type: GraphQLString },
  }),
})

export default variantType

export const variantLookUp = db =>
  db.collection('variants').find({
    // genes: 'ENSG00000155657',
    genes: 'ENSG00000169174',
  }, {
    _id: 1,
    variant_id: 1,
    allele_freq: 1,
  }).toArray()
