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
    index: browserConfig.elasticsearch.variants.index,
    type: browserConfig.elasticsearch.variants.type,
    size: 1,
    body: {
      query: {
        match: {
          variant_id: variantId,
        },
      },
    },
  })

  if (!response.hits.hits.length) {
    throw Error('Variant not found')
  }

  const doc = response.hits.hits[0]._source // eslint-disable-line no-underscore-dangle

  return Object.entries(doc.groups)
    .filter(entry => entry[1] && Object.entries(entry[1]).length !== 0)
    .map(([groupName, groupData]) => ({
      analysis_group: groupName,
      ...groupData,
    }))
}
