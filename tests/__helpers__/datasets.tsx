import { describe } from '@jest/globals'
import { allDatasetIds } from '../../dataset-metadata/metadata'

export const forAllDatasets = (contextDescription: string, tests: (datasetId: string) => void) => {
  describe.each(allDatasetIds)(contextDescription, tests)
}
