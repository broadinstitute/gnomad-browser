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
import { resolveReads, ReadsType } from '../shared/reads'
import { TranscriptConsequenceType } from '../shared/transcriptConsequence'

const GnomadVariantDetailsType = new GraphQLObjectType({
  name: 'GnomadVariantDetails',
  interfaces: [VariantInterface],
  fields: {
    // variant interface fields
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    // gnomAD specific fields
    colocatedVariants: { type: new GraphQLList(GraphQLString) },
    exome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantDetailsExomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(PopulationType) },
          qualityMetrics: { type: VariantQualityMetricsType },
          reads: {
            type: ReadsType,
            resolve: async obj => {
              if (!process.env.READS_DIR) {
                return null
              }
              try {
                return await resolveReads(process.env.READS_DIR, 'combined_bams_exomes', obj)
              } catch (err) {
                throw Error('Unable to load reads data')
              }
            },
          },
        },
      }),
    },
    genome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantDetailsGenomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(PopulationType) },
          qualityMetrics: { type: VariantQualityMetricsType },
          reads: {
            type: ReadsType,
            resolve: async obj => {
              if (!process.env.READS_DIR) {
                return null
              }
              try {
                return await resolveReads(process.env.READS_DIR, 'combined_bams_genomes', obj)
              } catch (err) {
                throw Error('Unable to load reads data')
              }
            },
          },
        },
      }),
    },
    rsid: { type: GraphQLString },
    sortedTranscriptConsequences: { type: new GraphQLList(TranscriptConsequenceType) },
  },
  isTypeOf: variantData => variantData.gqlType === 'GnomadVariantDetails',
})

export default GnomadVariantDetailsType
