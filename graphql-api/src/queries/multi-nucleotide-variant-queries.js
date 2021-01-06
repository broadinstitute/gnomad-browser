const { DATASET_LABELS } = require('../datasets')
const { UserVisibleError } = require('../errors')

const fetchMultiNuceotideVariantById = async (esClient, datasetId, variantId) => {
  if (datasetId !== 'gnomad_r2_1') {
    throw new UserVisibleError(
      `Multi-nucleotide variants are not available for ${DATASET_LABELS[datasetId]}`
    )
  }

  try {
    const response = await esClient.get({
      index: 'gnomad_v2_mnvs',
      type: '_doc',
      id: variantId,
    })

    const variant = response.body._source.value

    return {
      ...variant,
      reference_genome: 'GRCh37',
      constituent_snvs: variant.constituent_snvs.map((snv) => ({
        ...snv,
        exome: snv.exome.ac !== undefined ? snv.exome : null,
        genome: snv.genome.ac !== undefined ? snv.genome : null,
      })),
      exome: variant.exome.ac !== undefined ? variant.exome : null,
      genome: variant.genome.ac !== undefined ? variant.genome : null,
    }
  } catch (err) {
    // meta will not be present if the request times out in the queue before reaching ES
    if (err.meta && err.meta.body.found === false) {
      return null
    }
    throw err
  }
}

module.exports = {
  fetchMultiNuceotideVariantById,
}
