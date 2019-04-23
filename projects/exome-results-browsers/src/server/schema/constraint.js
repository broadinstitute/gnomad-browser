import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql'

export const ExacConstraintType = new GraphQLObjectType({
  name: 'ExacConstraint',
  fields: {
    // Expected
    exp_lof: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    exp_syn: { type: GraphQLFloat },
    // Observed
    n_lof: { type: GraphQLInt },
    n_mis: { type: GraphQLInt },
    n_syn: { type: GraphQLInt },
    // Z
    lof_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    syn_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
  },
})

export const fetchExacConstraintByTranscript = (ctx, transcriptId) =>
  ctx.database.mongo.collection('constraint').findOne({ transcript: transcriptId })

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
  const response = await ctx.database.elastic.search({
    index: 'gnomad_constraint_2_1_1',
    type: 'constraint',
    body: {
      query: {
        bool: {
          filter: {
            term: { transcript_id: transcriptId },
          },
        },
      },
    },
    size: 1,
  })

  const doc = response.hits.hits[0]

  // eslint-disable-next-line no-underscore-dangle
  return doc ? doc._source : null
}
