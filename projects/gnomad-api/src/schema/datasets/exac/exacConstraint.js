import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql'
import { UserVisibleError } from '../../errors'

export const ExacConstraintType = new GraphQLObjectType({
  name: 'ExacConstraint',
  fields: {
    // Expected
    exp_syn: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    exp_lof: { type: GraphQLFloat },
    // Observed
    obs_syn: { type: GraphQLInt },
    obs_mis: { type: GraphQLInt },
    obs_lof: { type: GraphQLInt },
    // mu
    mu_syn: { type: GraphQLFloat },
    mu_mis: { type: GraphQLFloat },
    mu_lof: { type: GraphQLFloat },
    // Z
    syn_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    lof_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
  },
})

export const fetchExacConstraintByTranscriptId = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'exac_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('ExAC constraint not found')
    }
    throw err
  }
}
