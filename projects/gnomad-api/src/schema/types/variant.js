import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { ReferenceGenomeType } from '../gene-models/referenceGenome'

import { LoFCurationInGeneType } from './curation'

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
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // Other fields
    consequence: { type: GraphQLString },
    consequence_in_canonical_transcript: { type: GraphQLBoolean },
    flags: { type: new GraphQLList(GraphQLString) },
    gene_id: { type: GraphQLString },
    gene_symbol: { type: GraphQLString },
    transcript_id: { type: GraphQLString },
    hgvs: { type: GraphQLString },
    hgvsc: { type: GraphQLString },
    hgvsp: { type: GraphQLString },
    lof: { type: GraphQLString },
    lof_filter: { type: GraphQLString },
    lof_flags: { type: GraphQLString },
    rsid: { type: GraphQLString },
    exome: { type: VariantSequencingDataType },
    genome: { type: VariantSequencingDataType },
    lof_curation: { type: LoFCurationInGeneType },
  },
})
