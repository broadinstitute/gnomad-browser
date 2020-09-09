import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { ReferenceGenomeType } from '../../gene-models/referenceGenome'
import { HistogramType } from '../shared/histogram'
import { TranscriptConsequenceType } from '../shared/transcriptConsequence'
import { MultiNucleotideVariantSummaryType } from './gnomadMultiNucleotideVariants'

const GnomadPopulationType = new GraphQLObjectType({
  name: 'GnomadVariantPopulation',
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    ac: { type: new GraphQLNonNull(GraphQLInt) },
    an: { type: new GraphQLNonNull(GraphQLInt) },
    ac_hemi: { type: GraphQLInt },
    ac_hom: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

const GnomadSiteQualityMetricType = new GraphQLObjectType({
  name: 'GnomadSiteQualityMetric',
  fields: {
    metric: { type: new GraphQLNonNull(GraphQLString) },
    value: { type: GraphQLFloat },
  },
})

const GnomadVariantQualityMetricsType = new GraphQLObjectType({
  name: 'GnomadVariantQualityMetrics',
  fields: {
    alleleBalance: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantAlleleBalance',
        fields: {
          alt: { type: HistogramType },
        },
      }),
    },
    genotypeDepth: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantGenotypeDepth',
        fields: {
          all: { type: HistogramType },
          alt: { type: HistogramType },
        },
      }),
    },
    genotypeQuality: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantGenotypeQuality',
        fields: {
          all: { type: HistogramType },
          alt: { type: HistogramType },
        },
      }),
    },
    siteQualityMetrics: {
      type: new GraphQLList(GnomadSiteQualityMetricType),
    },
  },
})

const GnomadVariantFilteringAlleleFrequencyType = new GraphQLObjectType({
  name: 'GnomadVariantFilteringAlleleFrequency',
  fields: {
    popmax: { type: GraphQLFloat },
    popmax_population: { type: GraphQLString },
  },
})

const GnomadVariantAgeDistribution = new GraphQLObjectType({
  name: 'GnomadVariantDetailsAgeDistribution',
  fields: {
    het: { type: HistogramType },
    hom: { type: HistogramType },
  },
})

const GnomadVariantDetailsType = new GraphQLObjectType({
  name: 'GnomadVariantDetails',
  fields: {
    // variant interface fields
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    reference_genome: { type: new GraphQLNonNull(ReferenceGenomeType) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    alt: { type: new GraphQLNonNull(GraphQLString) },
    // gnomAD specific fields
    colocatedVariants: { type: new GraphQLList(GraphQLString) },
    multiNucleotideVariants: { type: new GraphQLList(MultiNucleotideVariantSummaryType) },
    exome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantDetailsExomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          ac_hemi: { type: GraphQLInt },
          ac_hom: { type: GraphQLInt },
          faf95: { type: GnomadVariantFilteringAlleleFrequencyType },
          faf99: { type: GnomadVariantFilteringAlleleFrequencyType },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(GnomadPopulationType) },
          age_distribution: { type: GnomadVariantAgeDistribution },
          qualityMetrics: { type: GnomadVariantQualityMetricsType },
        },
      }),
    },
    flags: { type: new GraphQLList(GraphQLString) },
    genome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantDetailsGenomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          ac_hemi: { type: GraphQLInt },
          ac_hom: { type: GraphQLInt },
          faf95: { type: GnomadVariantFilteringAlleleFrequencyType },
          faf99: { type: GnomadVariantFilteringAlleleFrequencyType },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(GnomadPopulationType) },
          age_distribution: { type: GnomadVariantAgeDistribution },
          qualityMetrics: { type: GnomadVariantQualityMetricsType },
        },
      }),
    },
    rsid: { type: GraphQLString },
    sortedTranscriptConsequences: { type: new GraphQLList(TranscriptConsequenceType) },
  },
})

export default GnomadVariantDetailsType
