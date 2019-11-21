import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

import { UserVisibleError } from '../../errors'

export const GnomadConstraintType = new GraphQLObjectType({
  name: 'GnomadConstraint',
  fields: {
    // Expected
    exp_lof: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    exp_syn: { type: GraphQLFloat },
    // Observed
    obs_lof: { type: GraphQLInt },
    obs_mis: { type: GraphQLInt },
    obs_syn: { type: GraphQLInt },
    // Observed/Expected
    oe_lof: { type: GraphQLFloat },
    oe_lof_lower: { type: GraphQLFloat },
    oe_lof_upper: { type: GraphQLFloat },
    oe_mis: { type: GraphQLFloat },
    oe_mis_lower: { type: GraphQLFloat },
    oe_mis_upper: { type: GraphQLFloat },
    oe_syn: { type: GraphQLFloat },
    oe_syn_lower: { type: GraphQLFloat },
    oe_syn_upper: { type: GraphQLFloat },
    // Z
    lof_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    syn_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
    flags: { type: new GraphQLList(GraphQLString) },
  },
})

export const fetchGnomadConstraintByTranscript = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'gnomad_2_1_1_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError(`Constraint not found for transcript ${transcriptId}`)
    }
    throw err
  }
}
