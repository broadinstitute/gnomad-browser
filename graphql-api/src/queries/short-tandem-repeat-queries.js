const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const SHORT_TANDEM_REPEAT_INDICES = {
  gnomad_r3: 'gnomad_v3_short_tandem_repeats',
}

const fetchShortTandemRepeatById = async (esClient, datasetId, locusId) => {
  if (!SHORT_TANDEM_REPEAT_INDICES[datasetId]) {
    throw new UserVisibleError(
      `Short tandem repeats are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  try {
    const response = await esClient.get({
      index: SHORT_TANDEM_REPEAT_INDICES[datasetId],
      type: '_doc',
      id: locusId,
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
  fetchShortTandemRepeatById,
}
