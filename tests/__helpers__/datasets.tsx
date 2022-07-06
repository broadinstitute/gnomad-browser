import { describe } from '@jest/globals'
import { allDatasetIds, DatasetId } from '../../dataset-metadata/metadata'

export const forAllDatasets = (
  contextDescription: string,
  tests: (datasetId: DatasetId) => void
) => {
  describe.each(allDatasetIds)(contextDescription, tests)
}
