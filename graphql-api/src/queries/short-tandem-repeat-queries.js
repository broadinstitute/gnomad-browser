const { withCache } = require('../cache')
const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const { fetchAllSearchResults } = require('./helpers/elasticsearch-helpers')

const SHORT_TANDEM_REPEAT_INDICES = {
  gnomad_r3: 'gnomad_v3_short_tandem_repeats',
}

const SUMMARY_FIELDS = [
  'id',
  'value.id',
  'value.gene',
  'value.associated_diseases',
  'value.stripy_id',
  'value.reference_region',
  'value.reference_repeat_unit',
]

const fetchAllShortTandemRepeats = async (esClient, datasetId) => {
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const hits = await fetchAllSearchResults(esClient, {
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 10000,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        match_all: {},
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return hits.map((hit) => hit._source.value)
}

const fetchShortTandemRepeatById = async (esClient, datasetId, shortTandemRepeatId) => {
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  try {
    const response = await esClient.get({
      index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
      type: '_doc',
      id: shortTandemRepeatId,
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

const fetchShortTandemRepeatsByGene = async (esClient, datasetId, ensemblGeneId) => {
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        bool: {
          filter: {
            term: {
              ensembl_id: ensemblGeneId,
            },
          },
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit) => hit._source.value)
}

const fetchShortTandemRepeatsByRegion = async (esClient, datasetId, region) => {
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  const response = await esClient.search({
    index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
    type: '_doc',
    size: 100,
    _source: SUMMARY_FIELDS,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                'reference_region.chrom': region.chrom,
              },
            },
            {
              range: {
                'reference_region.start': {
                  lte: region.stop,
                },
              },
            },
            {
              range: {
                'reference_region.stop': {
                  gte: region.start,
                },
              },
            },
          ],
        },
      },
      sort: [{ id: { order: 'asc' } }],
    },
  })

  return response.body.hits.hits.map((hit) => hit._source.value)
}

module.exports = {
  fetchAllShortTandemRepeats: withCache(
    fetchAllShortTandemRepeats,
    (_, datasetId) => `short_tandem_repeats:${datasetId}`,
    { expiration: 86400 }
  ),
  fetchShortTandemRepeatById,
  fetchShortTandemRepeatsByGene,
  fetchShortTandemRepeatsByRegion,
}
