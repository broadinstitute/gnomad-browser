/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
} from 'graphql'

const populationType = new GraphQLObjectType({
  name: 'Populations',
  fields: () => ({
    'european_non_finnish': { type: GraphQLInt },
    'east_asian': { type: GraphQLInt },
    'other': { type: GraphQLInt },
    'african': { type: GraphQLInt },
    'latino': { type: GraphQLInt },
    'south_asian': { type: GraphQLInt },
    'european_finnish': { type: GraphQLInt },
    'ashkenazi_jewish': { type: GraphQLInt },
  }),
})

export default populationType
