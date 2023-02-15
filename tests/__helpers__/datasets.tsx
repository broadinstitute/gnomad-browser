import { describe } from '@jest/globals'
import { allDatasetIds, DatasetId } from '../../dataset-metadata/metadata'

export const forAllDatasets = (
  contextDescription: string,
  tests: (datasetId: DatasetId) => void
) => {
  describe.each(allDatasetIds)(contextDescription, tests)
}

export const forDatasetsMatching = (
  inclusionPattern: RegExp,
  contextDescription: string,
  tests: (datasetId: DatasetId) => void
) => {
  const matchingDatasets: DatasetId[] = allDatasetIds.filter((datasetId) =>
    inclusionPattern.test(datasetId)
  )
  describe.each(matchingDatasets)(contextDescription, tests)
}
export const forDatasetsNotMatching = (
  exclusionPattern: RegExp,
  contextDescription: string,
  tests: (datasetId: DatasetId) => void
) => {
  const matchingDatasets: DatasetId[] = allDatasetIds.filter(
    (datasetId) => !exclusionPattern.test(datasetId)
  )
  describe.each(matchingDatasets)(contextDescription, tests)
}

export const forAllDatasetsExcept = (
  datasetIdsToExclude: DatasetId[],
  contextDescription: string,
  tests: (datasetId: DatasetId) => void
) => {
  const datasetsStillIncluded = allDatasetIds.filter(
    (datasetId) => !datasetIdsToExclude.includes(datasetId)
  )
  describe.each(datasetsStillIncluded)(contextDescription, tests)
}
