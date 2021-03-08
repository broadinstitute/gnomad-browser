const { withCache } = require('../cache')

const { fetchAllSearchResults } = require('./helpers/elasticsearch-helpers')

const fetchGeneById = async (esClient, geneId, referenceGenome) => {
  try {
    const response = await esClient.get({
      index: `genes_${referenceGenome.toLowerCase()}`,
      type: '_doc',
      id: geneId,
    })

    return response.body._source.value
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    if (err.meta && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

const fetchGeneBySymbol = async (esClient, geneSymbol, referenceGenome) => {
  const response = await esClient.search({
    index: `genes_${referenceGenome.toLowerCase()}`,
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

  if (response.body.hits.total === 0) {
    return null
  }

  return response.body.hits.hits[0]._source.value
}

const fetchGenesByRegion = async (esClient, region) => {
  const { reference_genome: referenceGenome, xstart, xstop } = region

  const hits = await fetchAllSearchResults(esClient, {
    index: `genes_${referenceGenome.toLowerCase()}`,
    type: '_doc',
    size: 200,
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

  return hits.map((hit) => hit._source.value)
}

const fetchGenesMatchingText = async (esClient, query, referenceGenome) => {
  const upperCaseQuery = query.toUpperCase()

  // Ensembl ID
  if (/^ENSG\d{11}$/.test(upperCaseQuery)) {
    const gene = await fetchGeneById(esClient, upperCaseQuery, referenceGenome)
    return [
      {
        ensembl_id: gene.gene_id,
        symbol: gene.symbol,
      },
    ]
  }

  // Symbol
  const response = await esClient.search({
    index: `genes_${referenceGenome.toLowerCase()}`,
    type: '_doc',
    _source: ['gene_id', 'value.symbol'],
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

  if (response.body.hits.total === 0) {
    return []
  }

  return response.body.hits.hits
    .map((hit) => hit._source)
    .map((doc) => ({
      ensembl_id: doc.gene_id,
      symbol: doc.value.symbol,
    }))
}

module.exports = {
  fetchGeneById: withCache(
    fetchGeneById,
    (_, geneId, referenceGenome) => `gene:${geneId}:${referenceGenome}`,
    { expiration: 86400 }
  ),
  fetchGeneBySymbol,
  fetchGenesByRegion,
  fetchGenesMatchingText,
}
