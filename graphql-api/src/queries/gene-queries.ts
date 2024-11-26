import { withCache } from '../cache'

import { fetchAllSearchResults } from './helpers/elasticsearch-helpers'

const GENE_INDICES = {
  // GRCh37: 'genes_grch37',
  // GRCh38: 'genes_grch38',
  // GRCh37: 'genes_grch37-2024-11-15--15-23',
  // GRCh38: 'genes_grch38-2024-11-20--16-28',
  GRCh37: 'genes_grch37-2024-11-25--15-55',
  GRCh38: 'genes_grch38-2024-11-25--19-00',
}

const _fetchGeneById = async (esClient: any, geneId: any, referenceGenome: any) => {
  try {
    const response = await esClient.get({
      // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      index: GENE_INDICES[referenceGenome],
      type: '_doc',
      id: geneId,
    })

    return response.body._source.value
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    // @ts-expect-error TS(2571) FIXME: Object is of type 'unknown'.
    if (err.meta && err.meta.body && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

export const fetchGeneById = withCache(
  _fetchGeneById,
  (_: any, geneId: any, referenceGenome: any) => `gene:${geneId}:${referenceGenome}`,
  { expiration: 86400 }
)

export const fetchGeneBySymbol = async (esClient: any, geneSymbol: any, referenceGenome: any) => {
  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: GENE_INDICES[referenceGenome],
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { symbol_upper_case: geneSymbol.toUpperCase() } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total.value === 0) {
    return null
  }

  return response.body.hits.hits[0]._source.value
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

export const fetchGenesMatchingText = async (esClient: any, query: any, referenceGenome: any) => {
  const upperCaseQuery = query.toUpperCase()

  // Ensembl ID
  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const gene = await _fetchGeneById(esClient, upperCaseQuery, referenceGenome)
    return [
      {
        ensembl_id: gene.gene_id,
        symbol: gene.symbol,
      },
    ]
  }

  // Symbol
  const response = await esClient.search({
    // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    index: GENE_INDICES[referenceGenome],
    type: '_doc',
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

  if (response.body.hits.total.value === 0) {
    return []
  }

  return response.body.hits.hits
    .map((hit: any) => hit._source)
    .map((doc: any) => ({
      ensembl_id: doc.gene_id,
      ensembl_version: doc.value.gene_version,
      symbol: doc.value.symbol,
    }))
}
