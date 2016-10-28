/* eslint-disable camelcase */
/* eslint-disable quote-props */

import {
  GraphQLObjectType,
  GraphQLInt,
} from 'graphql'

const populationType = new GraphQLObjectType({
  name: 'Populations',
  fields: () => ({
    'European (Non-Finnish)': { type: GraphQLInt },
    'East Asian': { type: GraphQLInt },
    'Other': { type: GraphQLInt },
    'African': { type: GraphQLInt },
    'Latino': { type: GraphQLInt },
    'South Asian': { type: GraphQLInt },
    'European (Finnish)': { type: GraphQLInt },
    'Ashkenazi Jewish': { type: GraphQLInt },
  }),
})

export default populationType
