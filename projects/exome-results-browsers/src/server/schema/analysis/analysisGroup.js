import { GraphQLFloat, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql'

export const AnalysisGroupType = new GraphQLObjectType({
  name: 'AnalysisGroup',
  fields: {
    ac: { type: GraphQLInt },
    ac_case: { type: GraphQLInt },
    ac_ctrl: { type: GraphQLInt },
    af: { type: GraphQLFloat },
    allele_freq: {
      type: GraphQLFloat,
      resolve: obj => obj.af,
    },
    af_case: { type: GraphQLFloat },
    af_ctrl: { type: GraphQLFloat },
    an: { type: GraphQLInt },
    an_case: { type: GraphQLInt },
    an_ctrl: { type: GraphQLInt },
    analysis_group: { type: GraphQLString },
    beta: {
      type: GraphQLFloat,
      resolve: obj => obj.se,
    },
    contig: { type: GraphQLString },
    est: { type: GraphQLFloat },
    group: {
      type: GraphQLString,
      resolve: obj => obj.analysis_group,
    },
    p: { type: GraphQLFloat },
    pval: {
      type: GraphQLFloat,
      resolve: obj => obj.p,
    },
    pos: { type: GraphQLInt },
    se: { type: GraphQLFloat },
    variant_id: { type: GraphQLString },
    xpos: { type: GraphQLFloat },
  },
})

export const fetchAnalysisGroupsForVariant = async (ctx, variantId) => {
  const response = await ctx.database.elastic.search({
    index: BROWSER_CONFIG.elasticsearch.analysisGroups.index,
    type: BROWSER_CONFIG.elasticsearch.analysisGroups.type,
    size: 4000,
    body: {
      query: {
        match: {
          variant_id: variantId,
        },
      },
    },
  })
  return response.hits.hits.map(h => h._source) // eslint-disable-line no-underscore-dangle
}
