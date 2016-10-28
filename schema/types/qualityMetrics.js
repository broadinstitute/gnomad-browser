/* eslint-disable camelcase */

import {
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

const qualityMetricsType = new GraphQLObjectType({
  name: 'QualityMetrics',
  fields: () => ({
    FS: { type: GraphQLString },
    MQRankSum: { type: GraphQLString },
    InbreedingCoeff: { type: GraphQLString },
    VQSLOD: { type: GraphQLString },
    BaseQRankSum: { type: GraphQLString },
    MQ: { type: GraphQLString },
    ClippingRankSum: { type: GraphQLString },
    ReadPosRankSum: { type: GraphQLString },
    DP: { type: GraphQLString },
    QD: { type: GraphQLString },
  }),
})

export default qualityMetricsType
