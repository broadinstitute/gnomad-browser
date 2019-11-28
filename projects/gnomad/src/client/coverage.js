export const coverageDataset = datasetId => {
  // Coverage is not broken down by subset for gnomAD 2.1
  // Map all subset datasets to the main dataset.
  if (datasetId.startsWith('gnomad_r2_1')) {
    return 'gnomad_r2_1'
  }

  // SVs should show gnomAD 2.1 coverage
  if (datasetId.startsWith('gnomad_sv')) {
    return 'gnomad_r2_1'
  }

  return datasetId
}
