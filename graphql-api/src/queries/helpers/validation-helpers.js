const { DATASET_LABELS, DATASET_REFERENCE_GENOMES } = require('../../datasets')
const { UserVisibleError } = require('../../errors')

const assertDatasetAndReferenceGenomeMatch = (datasetId, referenceGenome) => {
  if (DATASET_REFERENCE_GENOMES[datasetId] !== referenceGenome) {
    throw new UserVisibleError(
      `${DATASET_LABELS[datasetId]} data is not available on reference genome ${referenceGenome}`
    )
  }
}

module.exports = {
  assertDatasetAndReferenceGenomeMatch,
}
