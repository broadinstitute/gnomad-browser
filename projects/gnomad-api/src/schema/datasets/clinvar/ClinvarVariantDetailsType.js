import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { VariantInterface } from '../../types/variant'

const ClinvarVariantDetailsType = new GraphQLObjectType({
  name: 'ClinvarVariantDetails',
  interfaces: [VariantInterface],
  isTypeOf: variantData => variantData.gqlType === 'ClinvarVariantDetails',
  fields: {
    // Variant ID fields
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // ClinVar specific fields
    allele_id: { type: GraphQLInt },
  },
})

export default ClinvarVariantDetailsType
