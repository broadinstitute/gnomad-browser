import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
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

const VariantSequencingDataType = new GraphQLObjectType({
  name: 'VariantSequencingData',
  fields: {
    ac: { type: GraphQLInt },
    ac_hemi: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    filters: { type: new GraphQLList(GraphQLString) },
    populations: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: 'VariantPopulations',
          fields: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            ac: { type: new GraphQLNonNull(GraphQLInt) },
            an: { type: new GraphQLNonNull(GraphQLInt) },
            ac_hemi: { type: new GraphQLNonNull(GraphQLInt) },
            ac_hom: { type: new GraphQLNonNull(GraphQLInt) },
          },
        })
      ),
    },
  },
})

export const VariantSummaryType = new GraphQLObjectType({
  name: 'VariantSummary',
  fields: {
    // Variant ID fields
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    // Other fields
    consequence: { type: GraphQLString },
    consequence_in_canonical_transcript: { type: GraphQLBoolean },
    flags: { type: new GraphQLList(GraphQLString) },
    hgvs: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    rsid: { type: GraphQLString },
    exome: { type: VariantSequencingDataType },
    genome: { type: VariantSequencingDataType },
  },
})
