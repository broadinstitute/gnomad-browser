import elasticsearch from '@elastic/elasticsearch'
import { withCache } from '../cache'

import { fetchAllSearchResultsFromMultipleIndices } from './helpers/elasticsearch-helpers'

import { ReferenceGenome } from '@gnomad/dataset-metadata/metadata'
import { LimitedElasticClient, GetResponse, SearchResponse, SearchHit } from '../elasticsearch'

type GeneIndex = 'genes_grch37' | 'genes_grch38' | 'genes_grch38_patches-2025-10-23--19-35'

type GeneSearchRegion = { reference_genome: ReferenceGenome; xstart: number; xstop: number }

const GENE_INDICES: Record<ReferenceGenome, GeneIndex[]> = {
  // Order matters here: later indices take precedence over earlier
  GRCh37: ['genes_grch37'],
  GRCh38: ['genes_grch38', 'genes_grch38_patches-2025-10-23--19-35'],
}

const _fetchGeneById = async (
  esClient: LimitedElasticClient,
  geneId: string,
  referenceGenome: ReferenceGenome
) => {
  const indices = GENE_INDICES[referenceGenome]
  const requests = indices.map(
    (index) =>
      esClient
        .get({
          index,
          type: '_doc',
          id: geneId,
        })
        .catch((err) => {
          // meta will not be present if the request times out in the queue before reaching ES
          if (err.meta && err.meta.body && err.meta.body.found === false) {
            return null
          }
          throw err
        }) as Promise<GetResponse | null>
  )
  return Promise.all(requests).then(
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
}

export const fetchGeneById = withCache(
  _fetchGeneById,
  (_: any, geneId: string, referenceGenome: ReferenceGenome) => `gene:${geneId}:${referenceGenome}`,
  { expiration: 86400 }
)

export const fetchGeneBySymbol = async (
  esClient: LimitedElasticClient,
  geneSymbol: string,
  referenceGenome: ReferenceGenome
) => {
  const indices = GENE_INDICES[referenceGenome]
  const responses = await searchMultipleIndices(esClient, indices, {
    body: {
      query: {
        bool: {
          filter: { term: { symbol_upper_case: geneSymbol.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  const responsesWithValue = responses.filter((response) => response.body.hits.total.value > 0)
  if (responsesWithValue.length === 0) {
    return null
  }

  return responsesWithValue[responsesWithValue.length - 1].body.hits.hits[0]._source.value
}

export const fetchGenesByRegion = async (
  esClient: LimitedElasticClient,
  region: GeneSearchRegion
) => {
  const { reference_genome, xstart, xstop } = region
  const indices = GENE_INDICES[reference_genome]

  const hits = await fetchAllSearchResultsFromMultipleIndices(esClient, indices, {
    size: 200,
    _source: [
      'value.exons',
      'value.gene_id',
      'value.start',
      'value.stop',
      'value.symbol',
      'value.transcripts.exons',
      'value.transcripts.start',
      'value.transcripts.stop',
      'value.transcripts.transcript_id',
    ],
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                xstart: {
                  lte: xstop,
                },
              },
            },
            {
              range: {
                xstop: {
                  gte: xstart,
                },
              },
            },
          ],
        },
      },
    },
  })

  const mergedHits = mergeHitsById(hits.flat())
  return mergedHits.map((hit) => hit._source.value)
}

const searchMultipleIndices = async (
  esClient: LimitedElasticClient,
  indices: string[],
  searchParams: elasticsearch.RequestParams.Search<any>
): Promise<SearchResponse[]> => {
  const requests = indices.map(
    (index) =>
      esClient.search({
        index,
        type: '_doc',
        ...searchParams,
      }) as Promise<SearchResponse>
  )

  return Promise.all(requests)
}

const mergeHitsById = (hits: SearchHit[]): SearchHit[] => {
  const ids: string[] = []
  const idsToHits: Record<string, any> = {}
  hits.forEach((hit) => {
    if (idsToHits[hit._id] === undefined) {
      ids.push(hit._id)
    }
    idsToHits[hit._id] = hit
  })
  return ids.map((id) => idsToHits[id])
}

const mergeResponsesById = (responses: SearchResponse[]) => {
  const ids: string[] = []
  const idsToDocs: Record<string, any> = {}
  responses.forEach((response) =>
    response.body.hits.hits.forEach((hit) => {
      if (idsToDocs[hit._id] === undefined) {
        ids.push(hit._id)
      }
      idsToDocs[hit._id] = hit._source
    })
  )

  return ids.map((id) => idsToDocs[id])
}

export const fetchGenesMatchingText = async (
  esClient: LimitedElasticClient,
  query: string,
  referenceGenome: ReferenceGenome
) => {
  const upperCaseQuery = query.toUpperCase()

  // Ensembl ID
  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const gene = await _fetchGeneById(esClient, upperCaseQuery, referenceGenome)
    return (
      gene && [
        {
          ensembl_id: gene.gene_id,
          symbol: gene.symbol,
        },
      ]
    )
  }

  // Symbol
  const responses = await searchMultipleIndices(esClient, GENE_INDICES[referenceGenome], {
    _source: ['gene_id', 'value.gene_version', 'value.symbol'],
    body: {
      query: {
        bool: {
          should: [
            { term: { symbol_upper_case: upperCaseQuery } },
            { prefix: { search_terms: upperCaseQuery } },
          ],
        },
      },
    },
    size: 5,
  })

  const responsesWithValue = responses.filter((response) => response.body.hits.total.value !== 0)
  if (responsesWithValue.length === 0) {
    return []
  }

  const mergedDocs = mergeResponsesById(responsesWithValue)

  return mergedDocs.map((doc) => ({
    ensembl_id: doc.gene_id,
    ensembl_version: doc.value.gene_version,
    symbol: doc.value.symbol,
  }))
}
