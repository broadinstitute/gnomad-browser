import elasticsearch from '@elastic/elasticsearch'
import { LimitedElasticClient, SearchResponse, SearchHit, GetResponse } from '../../elasticsearch'

/**
 * Search and then scroll to retrieve all pages of search results.
 *
 */
export const fetchAllSearchResults = async (client: LimitedElasticClient, searchParams: any) => {
  const allResults: SearchHit[] = []
  const responseQueue: SearchResponse[] = []

  const size = searchParams.size || 1000
  const scroll = searchParams.scroll || '30s'

  responseQueue.push(
    await (client.search({
      ...searchParams,
      scroll,
      size,
    }) as Promise<SearchResponse>)
  )

  while (responseQueue.length) {
    const response = responseQueue.shift()!
    allResults.push(...response.body.hits.hits)

    if (allResults.length === response.body.hits.total.value) {
      // eslint-disable-next-line no-await-in-loop
      await client.clearScroll({
        scroll_id: response.body._scroll_id, // eslint-disable-line no-underscore-dangle
      })
      break
    }

    responseQueue.push(
      // eslint-disable-next-line no-await-in-loop
      await (client.scroll({
        scroll,
        scrollId: response.body._scroll_id, // eslint-disable-line no-underscore-dangle
      }) as Promise<SearchResponse>)
    )
  }

  return allResults
}

export const fetchAllSearchResultsFromMultipleIndices = async (
  esClient: LimitedElasticClient,
  indices: string[],
  searchParams: elasticsearch.RequestParams.Search<any>
) => {
  const requests = indices.map((index) =>
    fetchAllSearchResults(esClient, {
      index,
      type: '_doc',
      ...searchParams,
    })
  )
  return Promise.all(requests)
}

// Retrieve index metadata set by data pipeline
export const fetchIndexMetadata = async (esClient: any, index: any) => {
  const response = await esClient.indices.getMapping({
    index,
  })

  // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
  // eslint-disable-next-line no-underscore-dangle
  return Object.values(response.body)[0].mappings._meta
}

export const getFromMultipleIndices = (requests: Promise<GetResponse | null>[]) =>
  Promise.all(requests).then(
    (responses) => {
      const responsesWithValue = responses.filter((response) => response !== null)
      return responsesWithValue.length > 0
        ? responsesWithValue[responsesWithValue.length - 1]!.body._source.value
        : null
    },
    (err) => {
      throw err
    }
  )
