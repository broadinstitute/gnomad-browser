import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import { VariantInterface } from '../types/variant'
import {
  extractPopulationData,
  PopulationType,
} from './shared/population'
import {
  parseHistogram,
  VariantQualityMetricsType,
} from './shared/qualityMetrics'
import { TranscriptConsequenceType } from './shared/transcriptConsequence'


export const GnomadVariantType = new GraphQLObjectType({
  name: 'gnomadVariant',
  interfaces: [VariantInterface],
  fields: {
    // common variant fields
    alt: { type: new GraphQLNonNull(GraphQLString) },
    chrom: { type: new GraphQLNonNull(GraphQLString) },
    pos: { type: new GraphQLNonNull(GraphQLInt) },
    ref: { type: new GraphQLNonNull(GraphQLString) },
    variantId: { type: new GraphQLNonNull(GraphQLString) },
    xpos: { type: new GraphQLNonNull(GraphQLFloat) },
    // gnomAD specific fields
    exome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantExomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(PopulationType) },
          qualityMetrics: { type: VariantQualityMetricsType },
        },
      }),
    },
    genome: {
      type: new GraphQLObjectType({
        name: 'GnomadVariantGenomeData',
        fields: {
          ac: { type: GraphQLInt },
          an: { type: GraphQLInt },
          filters: { type: new GraphQLList(GraphQLString) },
          populations: { type: new GraphQLList(PopulationType) },
          qualityMetrics: { type: VariantQualityMetricsType },
        },
      }),
    },
    rsid: { type: GraphQLString },
    sortedTranscriptConsequences: { type: new GraphQLList(TranscriptConsequenceType) },
  },
  isTypeOf: variantData => variantData.dataset === 'gnomad',
})


const GNOMAD_POPULATION_IDS = ['AFR', 'AMR', 'ASJ', 'EAS', 'FIN', 'NFE', 'OTH', 'SAS']


const extractQualityMetrics = variantData => ({
  genotypeDepth: {
    all: parseHistogram(variantData.DP_HIST_ALL),
    alt: parseHistogram(variantData.DP_HIST_ALT),
  },
  genotypeQuality: {
    all: parseHistogram(variantData.GQ_HIST_ALL),
    alt: parseHistogram(variantData.GQ_HIST_ALT),
  },
  siteQualityMetrics: {
    AB_MEDIAN: variantData.AB_MEDIAN,
    AS_RF: variantData.AS_RF,
    BaseQRankSum: variantData.BaseQRankSum,
    ClippingRankSum: variantData.ClippingRankSum,
    DP: variantData.DP,
    DP_MEDIAN: variantData.DP_MEDIAN,
    DREF_MEDIAN: variantData.DREF_MEDIAN,
    FS: variantData.FS,
    GQ_MEDIAN: variantData.GQ_MEDIAN,
    InbreedingCoeff: variantData.InbreedingCoeff,
    MQ: variantData.MQ,
    MQRankSum: variantData.MQRankSum,
    QD: variantData.QD,
    ReadPosRankSum: variantData.ReadPosRankSum,
    VQSLOD: variantData.VQSLOD,
  },
})


export const fetchGnomadVariant = async (variantId, ctx) => {
  const response = await ctx.database.elastic.search({
    index: ['gnomad_exomes_202_37', 'gnomad_genomes_202_37'],
    type: 'variant',
    body: {
      query: {
        bool: {
          filter: {
            term: { variantId }
          },
        },
      },
    }
  })

  if (response.hits.hits.length === 0) {
    throw Error('Variant not found')
  }

  /* eslint-disable no-underscore-dangle */
  const exomeData = (response.hits.hits.find(hit => hit._index === 'gnomad_exomes_202_37') || {})._source || {}
  const genomeData = (response.hits.hits.find(hit => hit._index === 'gnomad_genomes_202_37') || {})._source || {}
  /* eslint-enable no-underscore-dangle */
  const commonData = exomeData || genomeData

  return {
    // common variant fields
    alt: commonData.alt,
    chrom: commonData.contig,
    pos: commonData.pos,
    ref: commonData.ref,
    variantId: commonData.variantId,
    xpos: commonData.xpos,
    // gnomAD specific fields
    exome: {
      ac: exomeData.AC,
      an: exomeData.AN,
      filters: exomeData.filters,
      populations: extractPopulationData(GNOMAD_POPULATION_IDS, exomeData),
      qualityMetrics: extractQualityMetrics(exomeData),
    },
    genome: {
      ac: genomeData.AC,
      an: genomeData.AN,
      filters: genomeData.filters,
      populations: extractPopulationData(GNOMAD_POPULATION_IDS, genomeData),
      qualityMetrics: extractQualityMetrics(genomeData),
    },
    rsid: commonData.rsid,
    sortedTranscriptConsequences: JSON.parse(commonData.sortedTranscriptConsequences),
  }
}
