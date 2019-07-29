import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { VariantInterface } from '../../types/variant'
import { PopulationType } from '../shared/population'
import { VariantQualityMetricsType } from '../shared/qualityMetrics'
import { TranscriptConsequenceType } from '../shared/transcriptConsequence'

const ExacVariantDetailsType = new GraphQLObjectType({
  name: 'ExacVariantDetails',
  interfaces: [VariantInterface],
  fields: {
    // variant interface fields
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    // ExAC specific fields
    ac: {
      type: new GraphQLObjectType({
        name: 'ExacVariantAlleleCount',
        fields: {
          raw: { type: GraphQLInt },
          adj: { type: GraphQLInt },
          hemi: { type: GraphQLInt },
          hom: { type: GraphQLInt },
        },
      }),
    },
    an: {
      type: new GraphQLObjectType({
        name: 'ExacVariantAlleleNumber',
        fields: {
          raw: { type: GraphQLInt },
          adj: { type: GraphQLInt },
        },
      }),
    },
    filters: { type: new GraphQLList(GraphQLString) },
    flags: { type: new GraphQLList(GraphQLString) },
    populations: { type: new GraphQLList(PopulationType) },
    qualityMetrics: { type: VariantQualityMetricsType },
    rsid: { type: GraphQLString },
    sortedTranscriptConsequences: { type: new GraphQLList(TranscriptConsequenceType) },
  },
  isTypeOf: variantData => variantData.gqlType === 'ExacVariantDetails',
})

export default ExacVariantDetailsType
