import { GraphQLFloat, GraphQLInt, GraphQLNonNull, GraphQLObjectType } from 'graphql'

import { UserVisibleError } from '../../errors'

export const ExacRegionalMissenseConstraintRegionType = new GraphQLObjectType({
  name: 'ExacRegionalMissenseConstraintRegion',
  fields: {
    start: { type: new GraphQLNonNull(GraphQLInt) },
    stop: { type: new GraphQLNonNull(GraphQLInt) },
    obs_mis: { type: GraphQLInt },
    exp_mis: { type: GraphQLFloat },
    obs_exp: { type: GraphQLFloat },
    chisq_diff_null: { type: GraphQLFloat },
  },
})

export const fetchExacRegionalMissenseConstraintRegions = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'exac_regional_missense_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source.regions
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError(
        `ExAC regional missense constraint not available for transcript "${transcriptId}"`
      )
    }
    throw err
  }
}
