import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { ReferenceGenomeType } from '../gene-models/referenceGenome'

export const StructuralVariantSummaryType = new GraphQLObjectType({
  name: 'StructuralVariantSummary',
  fields: {
    ac: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    chrom2: { type: GraphQLString },
    end: { type: new GraphQLNonNull(GraphQLInt) },
    end2: { type: GraphQLInt },
    consequence: { type: GraphQLString },
    filters: { type: new GraphQLList(GraphQLString) },
    length: { type: GraphQLInt },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    pos2: { type: GraphQLInt },
    type: { type: new GraphQLNonNull(GraphQLString) },
    variant_id: { type: new GraphQLNonNull(GraphQLString) },
  },
})
