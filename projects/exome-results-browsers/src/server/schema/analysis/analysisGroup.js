import { GraphQLFloat, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

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
    index: BROWSER_CONFIG.elasticsearch.analysisGroups.index,
    type: BROWSER_CONFIG.elasticsearch.analysisGroups.type,
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
