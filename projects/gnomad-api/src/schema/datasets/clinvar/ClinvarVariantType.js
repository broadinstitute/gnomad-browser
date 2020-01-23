import { GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

import { ReferenceGenomeType } from '../../gene-models/referenceGenome'

const ClinvarVariantType = new GraphQLObjectType({
  name: 'ClinvarVariant',
  fields: {
    // Variant ID fields
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // ClinVar specific fields
    clinical_significance: { type: new GraphQLList(GraphQLString) },
    clinvar_variation_id: { type: new GraphQLNonNull(GraphQLString) },
    gold_stars: { type: new GraphQLNonNull(GraphQLInt) },
    major_consequence: { type: GraphQLString },
    review_status: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) },
  },
})

export default ClinvarVariantType
