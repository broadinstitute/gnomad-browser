import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLObjectType } from 'graphql'

export const RegionalMissenseConstraintRegionType = new GraphQLObjectType({
  name: 'RegionalMissenseConstraintRegion',
  fields: {
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    obs_mis: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    obs_exp: { type: GraphQLFloat },
    chisq_diff_null: { type: GraphQLFloat },
  },
})

export const fetchExacRegionalMissenseConstraintRegions = async (ctx, geneName) => {
  const response = await ctx.database.elastic.search({
    index: 'exac_regional_missense_constraint_regions',
    type: 'region',
    size: 100,
    body: {
      query: {
        bool: {
          filter: {
            term: { gene_name: geneName },
          },
        },
      },
    },
  })

  return response.hits.hits.map(hit => hit._source) // eslint-disable-line no-underscore-dangle
}
