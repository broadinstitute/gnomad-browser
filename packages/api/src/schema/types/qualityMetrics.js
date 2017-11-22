/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLInt,
} from 'graphql'

const qualityMetricsType = new GraphQLObjectType({
  name: 'QualityMetrics',
  fields: () => ({
    FS: { type: GraphQLFloat },
    MQRankSum: { type: GraphQLFloat },
    InbreedingCoeff: { type: GraphQLFloat },
    VQSLOD: { type: GraphQLFloat },
    BaseQRankSum: { type: GraphQLFloat },
    MQ: { type: GraphQLFloat },
    ClippingRankSum: { type: GraphQLFloat },
    ReadPosRankSum: { type: GraphQLFloat },
    DP: { type: GraphQLFloat },
    QD: { type: GraphQLFloat },
    AS_RF: { type: GraphQLFloat },
    DREF_MEDIAN: { type: GraphQLFloat },
    DP_MEDIAN: { type: GraphQLInt },
    GQ_MEDIAN: { type: GraphQLInt },
    AB_MEDIAN: { type: GraphQLFloat },
    GQ_HIST_ALT: { type: GraphQLString },
    DP_HIST_ALT: { type: GraphQLString },
    AB_HIST_ALT: { type: GraphQLString },
    GQ_HIST_ALL: { type: GraphQLString },
    DP_HIST_ALL: { type: GraphQLString },
    AB_HIST_ALL: { type: GraphQLString },
  }),
})

export default qualityMetricsType
