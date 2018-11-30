import {
  GraphQLEnumType,
  GraphQLFloat,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'

import browserConfig from '@browser/config'

export const AnalysisGroupArgumentType = new GraphQLEnumType({
  name: 'AnalysisGroupId',
  values: browserConfig.analysisGroups.selectableGroups.reduce(
    (values, analysisGroup) => ({ ...values, [analysisGroup]: {} }),
    {}
  ),
})

export const AnalysisGroupType = new GraphQLObjectType({
  name: 'AnalysisGroup',
  fields: {
    ac: { type: GraphQLInt },
    ac_case: { type: GraphQLInt },
    ac_ctrl: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    af_case: { type: GraphQLFloat },
    af_ctrl: { type: GraphQLFloat },
    an: { type: GraphQLInt },
    an_case: { type: GraphQLInt },
    an_ctrl: { type: GraphQLInt },
    analysis_group: { type: GraphQLString },
    est: { type: GraphQLFloat },
    p: { type: GraphQLFloat },
    se: { type: GraphQLFloat },
  },
})

export const fetchAnalysisGroupsForVariant = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: browserConfig.elasticsearch.analysisGroups.index,
    type: browserConfig.elasticsearch.analysisGroups.type,
    size: 100,
    body: {
      query: {
        match: {
          variant_id: variantId,
        },
      },
    },
  })
  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}
