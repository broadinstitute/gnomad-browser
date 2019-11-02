import { GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { ReferenceGenomeType } from '../../gene-models/referenceGenome'

const ClinvarVariantDetailsType = new GraphQLObjectType({
  name: 'ClinvarVariantDetails',
  fields: {
    // Variant ID fields
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // ClinVar specific fields
    allele_id: { type: GraphQLInt },
  },
})

export default ClinvarVariantDetailsType
