import { datasetLabels } from '../../dataset-metadata/metadata'

export const referenceGenomeForDataset = (datasetId: any) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return 'GRCh38'
  }

  return 'GRCh37'
}

// @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
export const labelForDataset = (datasetId: any) => datasetLabels[datasetId] || 'Unknown'
