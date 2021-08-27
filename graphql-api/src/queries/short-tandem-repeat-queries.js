const { withCache } = require('../cache')
const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const { fetchAllSearchResults } = require('./helpers/elasticsearch-helpers')

const SHORT_TANDEM_REPEAT_INDICES = {
  gnomad_r3: 'gnomad_v3_short_tandem_repeats',
}

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
    _source: [
      'id',
      'value.id',
      'value.gene',
      'value.inheritance_mode',
      'value.associated_disease',
      'value.stripy_id',
      'value.reference_region',
      'value.repeat_unit',
    ],
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

module.exports = {
  fetchAllShortTandemRepeats: withCache(
    fetchAllShortTandemRepeats,
    (_, datasetId) => `short_tandem_repeats:${datasetId}`,
    { expiration: 86400 }
  ),
  fetchShortTandemRepeatById,
}
