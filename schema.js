import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  // GraphQLString,
  GraphQLList,
} from 'graphql'

const data = [
  { counter: 42 },
  { counter: 43 },
  { counter: 44 },
]

const counterType = new GraphQLObjectType ({
  name: 'Counter',
  fields: () => ({
    counter: { type: GraphQLInt },
  }),
})
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
      data: {
        type: new GraphQLList(counterType),
        resolve: () => data,
      },
    }),
  }),
})

export default schema
