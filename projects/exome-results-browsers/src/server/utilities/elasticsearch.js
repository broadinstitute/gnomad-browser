/**
 * Search and then scroll to retrieve all pages of search results.
 *
 * @param {elasticsearch.Client} esClient Elasticsearch client
 * @param {Object} searchParams Argument to elasticsearch.Client#search
 * @return {Object[]} Combined list of hits from all responses
 */
export async function fetchAllSearchResults(esClient, searchParams) {
  let allResults = []
  const responseQueue = []

  const size = searchParams.size || 1000
  const scroll = searchParams.scroll || '30s'

  responseQueue.push(await esClient.search(Object.assign({}, searchParams, { scroll, size })))

  while (responseQueue.length) {
    const response = responseQueue.shift()
    allResults = allResults.concat(response.hits.hits)

    if (allResults.length === response.hits.total) {
      // eslint-disable-next-line no-await-in-loop
      await esClient.clearScroll({
        scrollId: response._scroll_id, // eslint-disable-line no-underscore-dangle
      })
      break
    }

    responseQueue.push(
      // eslint-disable-next-line no-await-in-loop
      await esClient.scroll({
        scroll,
        scrollId: response._scroll_id, // eslint-disable-line no-underscore-dangle
      })
    )
  }

  return allResults
}
