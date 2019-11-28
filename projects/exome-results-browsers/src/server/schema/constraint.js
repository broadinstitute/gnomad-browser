import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql'

import { UserVisibleError } from '../utilities/errors'

export const ExacConstraintType = new GraphQLObjectType({
  name: 'ExacConstraint',
  fields: {
    // Expected
    exp_lof: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    exp_syn: { type: GraphQLFloat },
    // Observed
    obs_lof: { type: GraphQLInt },
    obs_mis: { type: GraphQLInt },
    obs_syn: { type: GraphQLInt },
    // Z
    lof_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    syn_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
  },
})

export const fetchExacConstraintByTranscript = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'exac_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source // eslint-disable-line no-underscore-dangle
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('ExAC constraint not found')
    }
    throw err
  }
}

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
    oe_mis: { type: GraphQLFloat },
    oe_syn: { type: GraphQLFloat },
    // Z
    lof_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    syn_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
  },
})

export const fetchGnomadConstraintByTranscript = async (ctx, transcriptId) => {
  try {
    const response = await ctx.database.elastic.get({
      index: 'gnomad_2_1_1_constraint',
      type: 'documents',
      id: transcriptId,
    })

    return response._source // eslint-disable-line no-underscore-dangle
  } catch (err) {
    if (err.message === 'Not Found') {
      throw new UserVisibleError('gnomAD constraint not found')
    }
    throw err
  }
}
