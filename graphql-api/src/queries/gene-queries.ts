import { withCache } from '../cache'

import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

import { ReferenceGenome } from '@gnomad/dataset-metadata/metadata'
import { LimitedElasticClient, GetResponse, SearchResponse } from '../elasticsearch'

type GeneIndex = 'genes_grch37' | 'genes_grch38' | 'genes_grch38_patches-2025-09-19--18-17'

const GENE_INDICES: Record<ReferenceGenome, GeneIndex[]> = {
  // Order matters here: later indices take precedence over earlier
  GRCh37: ['genes_grch37'],
  GRCh38: ['genes_grch38', 'genes_grch38_patches-2025-09-19--18-17'],
}

const _fetchGeneById = async (
  esClient: LimitedElasticClient,
  geneId: any,
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
  (_: any, geneId: any, referenceGenome: any) => `gene:${geneId}:${referenceGenome}`,
  { expiration: 86400 }
)

export const fetchGeneBySymbol = async (esClient: any, geneSymbol: any, referenceGenome: any) => {
  const responses = await searchMultipleIndices(esClient, referenceGenome, {
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

export const fetchGenesByRegion = async (esClient: any, region: any) => {
  const { reference_genome: referenceGenome, xstart, xstop } = region

  const hits = await fetchAllSearchResults(esClient, {
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: GENE_INDICES[referenceGenome],
    type: '_doc',
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

  return hits.map((hit: any) => hit._source.value)
}

const searchMultipleIndices = async (
  esClient: LimitedElasticClient,
  referenceGenome: ReferenceGenome,
  searchParams: any
) => {
  const indices = GENE_INDICES[referenceGenome]
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

export const fetchGenesMatchingText = async (esClient: any, query: any, referenceGenome: any) => {
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
  const responses = await searchMultipleIndices(esClient, referenceGenome, {
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

  let geneIds: string[] = []
  let geneIdsToDocs: Record<string, any> = {}
  responsesWithValue.forEach((response) =>
    response.body.hits.hits.forEach((hit) => {
      if (geneIdsToDocs[hit._id] === undefined) {
        geneIds.push(hit._id)
      }
      geneIdsToDocs[hit._id] = hit._source
    })
  )

  const patchedGeneDocs = geneIds.map((geneId) => geneIdsToDocs[geneId])
  return patchedGeneDocs.map((doc) => ({
    ensembl_id: doc.gene_id,
    ensembl_version: doc.value.gene_version,
    symbol: doc.value.symbol,
  }))
}
