export const referenceGenomeForDataset = (datasetId: any) => {
  if (datasetId.startsWith('gnomad_r3')) {
    return 'GRCh38'
  }

  return 'GRCh37'
}
