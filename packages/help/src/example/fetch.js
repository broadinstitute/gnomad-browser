import elasticsearch from 'elasticsearch'
import { fromJS } from 'immutable'

export const client = new elasticsearch.Client({
  host: 'elastic:9200',
})

export function searchHelpTopics (query, index) {
  return new Promise((resolve, reject) => {
    client.search({
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
      console.log(response)
      resolve(fromJS(response.hits))
    })
  })
}

export function fetchDefaultTopics (topics, index) {
  console.log(topics)
  return new Promise((resolve, reject) => {
    client.search({
      index,
      type: 'entry',
      body: {
        query: {
          match_all: {}
        },
      }
      // body: {
      //   query: {
      //     bool: {
      //       must: {
      //         bool: {
      //           should: topics.map(topic => ({ match: { topic } })),
      //         }
      //       }
      //     },
      //   },
      // }
    }).then((response) => {
      console.log(response)
      resolve(fromJS(response.hits))
    })
  })
}
