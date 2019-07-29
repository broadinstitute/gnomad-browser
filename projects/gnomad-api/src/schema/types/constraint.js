/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
} from 'graphql'

const constraintType = new GraphQLObjectType({
  name: 'Constraint',
  fields: () => ({
    'mu_syn': { type: GraphQLFloat },
    'exp_syn': { type: GraphQLFloat },
    'cnv_z': { type: GraphQLFloat },
    'pLI': { type: GraphQLFloat },
    'syn_z': { type: GraphQLFloat },
    'n_lof': { type: GraphQLInt },
    'n_mis': { type: GraphQLInt },
    'n_syn': { type: GraphQLInt },
    'lof_z': { type: GraphQLFloat },
    'tx_start': { type: GraphQLInt },
    'mu_mis': { type: GraphQLFloat },
    'transcript': { type: GraphQLString },
    'n_cnv': { type: GraphQLInt },
    'exp_lof': { type: GraphQLFloat },
    'mis_z': { type: GraphQLFloat },
    'exp_cnv': { type: GraphQLFloat },
    'tx_end': { type: GraphQLInt },
    'n_exons': { type: GraphQLInt },
    'mu_lof': { type: GraphQLFloat },
    'bp': { type: GraphQLInt },
    'exp_mis': { type: GraphQLFloat },
  }),
})

export default constraintType

export const lookUpConstraintByTranscriptId = (db, transcript) =>
  db.collection('constraint').findOne({ transcript })
