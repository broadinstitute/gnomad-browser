/* eslint-disable camelcase */
/* eslint-disable no-underscore-dangle */
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLFloat,
  GraphQLList,
  GraphQLBoolean,
  GraphQLNonNull,
} from 'graphql'

const helpTopicType = new GraphQLObjectType({
  name: 'HelpTopic',
  fields: () => ({
    id: { type: GraphQLString },
    title: { type: GraphQLString },
    htmlString: { type: GraphQLString },
    vcfKey: { type: GraphQLString },
    score: { type: GraphQLFloat },
  }),
})

const helpType = new GraphQLObjectType({
  name: 'Help',
  fields: () => ({
    index: {
      type: GraphQLString },
    topics: {
      type: new GraphQLList(helpTopicType),
    },
  }),
})

function receiveHelpTopics (response) {
  return response.hits.hits.map(hit => ({
    id: hit._source.id,
    title: hit._source.title,
    htmlString: hit._source.htmlString,
    vcfkey: hit._source.vcfkey,
    score: hit._score,
  }))
}

export function searchHelpTopics (elasticClient, index, query) {
  return new Promise((resolve, reject) => {
    elasticClient.search({
      index,
      type: 'entry',
      body: {
        query: {
          match_phrase_prefix: {
            htmlString: query
          }
        },
        highlight: {
          fields: {
            htmlString: { }
          }
        }
      }
    }).then((response) => {
      resolve(receiveHelpTopics(response))
    })
  })
}

export function fetchDefaultTopics (elasticClient, index) {
  return new Promise((resolve, reject) => {
    elasticClient.search({
      index,
      size: 1000,
      type: 'entry',
      body: {
        query: {
          match_all: {}
        },
      }
    }).then((response) => {
      resolve(receiveHelpTopics(response))
    })
  })
}

export default {
  type: helpType,
  args: {
    index: { type: new GraphQLNonNull(GraphQLString) },
    query: { type: GraphQLString },
    getDefaults: { type: GraphQLBoolean },
  },
  resolve: (obj, args, ctx) => {
    const topics = args.getDefaults ?
      fetchDefaultTopics(ctx.database.elastic, args.index) :
      searchHelpTopics(ctx.database.elastic, args.index, args.query)
    return {
      index: args.index,
      topics,
    }
  }
}
