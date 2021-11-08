const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const LOCAL_ANCESTRY_INDICES = {
  gnomad_r3: 'gnomad_v3_local_ancestry',
}

const fetchLocalAncestryPopulationsByVariant = async (esClient, datasetId, variantId) => {
  const index = LOCAL_ANCESTRY_INDICES[datasetId]
  if (!index) {
    throw new UserVisibleError(`Local ancestry is not available for ${DATASET_LABELS[datasetId]}`)
  }

  const response = await esClient.search({
    index,
    type: '_doc',
    body: {
      query: {
        bool: {
          filter: { term: { variant_id: variantId } },
        },
      },
    },
    size: 1,
  })

  if (response.body.hits.total === 0) {
    return { exome: [], genome: [] }
  }

  return response.body.hits.hits[0]._source.value.populations
}

module.exports = {
  fetchLocalAncestryPopulationsByVariant,
}
