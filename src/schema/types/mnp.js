/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
  GraphQLString,
} from 'graphql'

const mnpType = new GraphQLObjectType({
  name: 'MNP',
  fields: () => ({
    'category': { type: GraphQLString },
    'xpos': { type: GraphQLInt },
    'site2': { type: GraphQLString },
    'number_samples': { type: GraphQLString },
    'combined_codon_change': { type: GraphQLString },
    'alt': { type: GraphQLString },
    'ref': { type: GraphQLString },
  }),
})

export default mnpType
