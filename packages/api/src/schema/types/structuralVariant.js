import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

export const StructuralVariantSummaryType = new GraphQLObjectType({
  name: 'StructuralVariantSummary',
  fields: {
    ac: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    end_chrom: { type: new GraphQLNonNull(GraphQLString) },
    end_pos: { type: new GraphQLNonNull(GraphQLInt) },
    consequence: { type: GraphQLString },
    filters: { type: new GraphQLList(GraphQLString) },
    length: { type: GraphQLInt },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    type: { type: new GraphQLNonNull(GraphQLString) },
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
  },
})
