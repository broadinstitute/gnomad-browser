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
          match: {
            _all: query
          }
        }
      }
    }).then(response => resolve(fromJS(response.hits)))
  })
}
