import elasticsearch from 'elasticsearch'
import { fromJS } from 'immutable'

export const client = new elasticsearch.Client({
  host: 'elastic:9200',
})

export function searchHelpTopics (query) {
  return new Promise((resolve, reject) => {
    client.search({
      index: 'help_example',
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
