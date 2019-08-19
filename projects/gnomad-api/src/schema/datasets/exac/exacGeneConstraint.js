import { GraphQLFloat, GraphQLInt, GraphQLObjectType } from 'graphql'

export const ExacGeneConstraintType = new GraphQLObjectType({
  name: 'Constraint',
  fields: {
    // Expected
    exp_syn: { type: GraphQLFloat },
    exp_mis: { type: GraphQLFloat },
    exp_lof: { type: GraphQLFloat },
    exp_cnv: { type: GraphQLFloat },
    // Observed
    n_syn: { type: GraphQLInt },
    n_mis: { type: GraphQLInt },
    n_lof: { type: GraphQLInt },
    n_cnv: { type: GraphQLInt },
    // mu
    mu_syn: { type: GraphQLFloat },
    mu_mis: { type: GraphQLFloat },
    mu_lof: { type: GraphQLFloat },
    // Z
    syn_z: { type: GraphQLFloat },
    mis_z: { type: GraphQLFloat },
    lof_z: { type: GraphQLFloat },
    cnv_z: { type: GraphQLFloat },
    // Other
    pLI: { type: GraphQLFloat },
  },
})

export const fetchExacGeneConstraintByTranscriptId = (ctx, transcriptId) =>
  ctx.database.gnomad.collection('constraint').findOne({ transcript: transcriptId })
