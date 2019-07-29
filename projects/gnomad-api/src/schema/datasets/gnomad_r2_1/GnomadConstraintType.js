import { GraphQLFloat, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from 'graphql'

const GnomadConstraintType = new GraphQLObjectType({
  name: 'GnomADConstraint',
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
    gene_issues: { type: new GraphQLList(GraphQLString) },
    pLI: { type: GraphQLFloat },
    pNull: { type: GraphQLFloat },
    pRec: { type: GraphQLFloat },
  },
})

export default GnomadConstraintType
