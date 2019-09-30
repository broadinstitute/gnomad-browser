import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { ReferenceGenomeType } from '../../gene-models/referenceGenome'
import { VariantInterface } from '../../types/variant'
import { TranscriptConsequenceType } from '../shared/transcriptConsequence'

const ExacVariantPopulationDataType = new GraphQLObjectType({
  name: 'ExacVariantPopulationData',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
    an: { type: new GraphQLNonNull(GraphQLInt) },
    ac_hemi: { type: new GraphQLNonNull(GraphQLInt) },
    ac_hom: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

const ExacQualityMetricHistogramType = new GraphQLObjectType({
  name: 'ExacQualityMetricHistogram',
  fields: {
    bin_edges: { type: new GraphQLList(GraphQLInt) },
    bin_freq: { type: new GraphQLList(GraphQLInt) },
  },
})

const ExacAgeHistogramType = new GraphQLObjectType({
  name: 'ExacAgeHistogram',
  fields: {
    bin_edges: { type: new GraphQLList(GraphQLInt) },
    bin_freq: { type: new GraphQLList(GraphQLInt) },
    n_larger: { type: GraphQLInt },
    n_smaller: { type: GraphQLInt },
  },
})

const ExacVariantDetailsType = new GraphQLObjectType({
  name: 'ExacVariantDetails',
  interfaces: [VariantInterface],
  fields: {
    // variant interface fields
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // ExAC specific fields
    ac: { type: GraphQLInt },
    ac_hemi: { type: GraphQLInt },
    ac_hom: { type: GraphQLInt },
    an: { type: GraphQLInt },
    filters: { type: new GraphQLList(GraphQLString) },
    flags: { type: new GraphQLList(GraphQLString) },
    other_alt_alleles: { type: new GraphQLList(GraphQLString) },
    populations: { type: new GraphQLList(ExacVariantPopulationDataType) },
    age_distribution: {
      type: new GraphQLObjectType({
        name: 'ExacVariantDetailsAgeDistribution',
        fields: {
          het: { type: ExacAgeHistogramType },
          hom: { type: ExacAgeHistogramType },
        },
      }),
    },
    qualityMetrics: {
      type: new GraphQLObjectType({
        name: 'ExacVariantQualityMetrics',
        fields: {
          genotypeDepth: {
            type: new GraphQLObjectType({
              name: 'ExacVariantGenotypeDepth',
              fields: {
                all: { type: ExacQualityMetricHistogramType },
                alt: { type: ExacQualityMetricHistogramType },
              },
            }),
          },
          genotypeQuality: {
            type: new GraphQLObjectType({
              name: 'ExacVariantGenotypeQuality',
              fields: {
                all: { type: ExacQualityMetricHistogramType },
                alt: { type: ExacQualityMetricHistogramType },
              },
            }),
          },
          siteQualityMetrics: {
            type: new GraphQLObjectType({
              name: 'ExacVariantSiteQualityMetrics',
              fields: {
                BaseQRankSum: { type: GraphQLFloat },
                ClippingRankSum: { type: GraphQLFloat },
                DP: { type: GraphQLFloat },
                FS: { type: GraphQLFloat },
                InbreedingCoeff: { type: GraphQLFloat },
                MQ: { type: GraphQLFloat },
                MQRankSum: { type: GraphQLFloat },
                QD: { type: GraphQLFloat },
                ReadPosRankSum: { type: GraphQLFloat },
                SiteQuality: { type: GraphQLFloat },
                VQSLOD: { type: GraphQLFloat },
              },
            }),
          },
        },
      }),
    },
    rsid: { type: GraphQLString },
    sortedTranscriptConsequences: { type: new GraphQLList(TranscriptConsequenceType) },
  },
  isTypeOf: variantData => variantData.gqlType === 'ExacVariantDetails',
})

export default ExacVariantDetailsType
