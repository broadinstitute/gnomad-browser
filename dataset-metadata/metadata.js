import { datasetLabels } from '../browser/src/datasets.ts'

const fullDatasetIds = Object.getOwnPropertyNames(datasetLabels).filter(
  (datasetId) => datasetId === 'exac' || datasetId.match(/_r\d+(_\d+)*$/)
)

export const isSubset = (datasetId) => !fullDatasetIds.includes(datasetId)
