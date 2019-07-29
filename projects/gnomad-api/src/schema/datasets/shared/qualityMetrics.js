import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
} from 'graphql'


export const VariantQualityMetricsType = new GraphQLObjectType({
  name: 'VariantQualityMetrics',
  fields: {
    genotypeDepth: {
      type: new GraphQLObjectType({
        name: 'VariantGenotypeDepth',
        fields: {
          all: { type: new GraphQLList(GraphQLInt) },
          alt: { type: new GraphQLList(GraphQLInt) },
        },
      }),
    },
    genotypeQuality: {
      type: new GraphQLObjectType({
        name: 'VariantGenotypeQuality',
        fields: {
          all: { type: new GraphQLList(GraphQLInt) },
          alt: { type: new GraphQLList(GraphQLInt) },
        },
      }),
    },
    siteQualityMetrics: {
      type: new GraphQLObjectType({
        name: 'VariantSiteQualityMetrics',
        fields: {
          AB_MEDIAN: { type: GraphQLFloat },
          AS_RF: { type: GraphQLFloat },
          BaseQRankSum: { type: GraphQLFloat },
          ClippingRankSum: { type: GraphQLFloat },
          DP: { type: GraphQLFloat },
          DP_MEDIAN: { type: GraphQLInt },
          DREF_MEDIAN: { type: GraphQLFloat },
          FS: { type: GraphQLFloat },
          GQ_MEDIAN: { type: GraphQLInt },
          InbreedingCoeff: { type: GraphQLFloat },
          MQ: { type: GraphQLFloat },
          MQRankSum: { type: GraphQLFloat },
          QD: { type: GraphQLFloat },
          ReadPosRankSum: { type: GraphQLFloat },
          SiteQuality: { type: GraphQLFloat },
          VQSLOD: { type: GraphQLFloat },
        }
      })
    }
  }
})


export const parseHistogram = histogramStr => histogramStr.split('|').map(s => Number(s))
