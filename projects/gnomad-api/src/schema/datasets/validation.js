import { UserVisibleError } from '../errors'

import datasetsConfig from './datasetsConfig'

export const assertDatasetAndReferenceGenomeMatch = (datasetId, referenceGenome) => {
  const datasetConfig = datasetsConfig[datasetId]
  if (datasetConfig.referenceGenome !== referenceGenome) {
    throw new UserVisibleError(
      `${datasetConfig.label} data is not available on reference genome ${referenceGenome}`
    )
  }
}
