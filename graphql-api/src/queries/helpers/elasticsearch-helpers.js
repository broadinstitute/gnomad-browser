/**
 * Search and then scroll to retrieve all pages of search results.
 *
 * @param {elasticsearch.Client} client Elasticsearch client
 * @param {Object} searchParams Argument to elasticsearch.Client#search
 * @return {Object[]} Combined list of hits from all responses
 */
const fetchAllSearchResults = async (client, searchParams) => {
  let allResults = []
  const responseQueue = []

  const size = searchParams.size || 1000
  const scroll = searchParams.scroll || '30s'

  responseQueue.push(
    await client.search({
      ...searchParams,
      scroll,
      size,
    })
  )

  while (responseQueue.length) {
    const response = responseQueue.shift()
    allResults = allResults.concat(response.body.hits.hits)

    if (allResults.length === response.body.hits.total) {
      // eslint-disable-next-line no-await-in-loop
      await client.clearScroll({
        scrollId: response.body._scroll_id, // eslint-disable-line no-underscore-dangle
      })
      break
    }

    responseQueue.push(
      // eslint-disable-next-line no-await-in-loop
      await client.scroll({
        scroll,
        scrollId: response.body._scroll_id, // eslint-disable-line no-underscore-dangle
      })
    )
  }

  return allResults
}

module.exports = {
  fetchAllSearchResults,
}
