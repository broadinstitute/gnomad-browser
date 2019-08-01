import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

const ClinvarVariantSummaryType = new GraphQLObjectType({
  name: 'ClinvarVariantSummary',
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
    clinical_significance: { type: GraphQLString },
    consequence: { type: GraphQLString },
    gold_stars: { type: GraphQLInt },
  },
})

export default ClinvarVariantSummaryType
