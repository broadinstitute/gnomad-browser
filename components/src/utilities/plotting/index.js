import R from 'ramda'

export const getMaxMeanFromCoverageDatasets = (dataConfig) => {
  const joined = dataConfig.datasets.reduce((acc, dataset) => acc.concat(dataset.data), [])
  return R.reduce((acc, value) => R.max(acc, value.mean), 0, joined)
}
