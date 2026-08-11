import { DatasetId, isLongRead } from '@gnomad/dataset-metadata/metadata'

const SHOW_SHORT_READ_COVERAGE_PARAM = 'show_short_read_coverage'

type CoverageContextRegion = {
  reference_genome: 'GRCh37' | 'GRCh38'
  chrom: string
}

export const isShortReadCoverageContextEligible = (
  datasetId: DatasetId,
  region: CoverageContextRegion
) =>
  isLongRead(datasetId) &&
  region.reference_genome === 'GRCh38' &&
  /^(?:[1-9]|1[0-9]|2[0-2])$/.test(region.chrom)

export const updateShortReadCoverageSearch = (search: string, show: boolean) => {
  const params = new URLSearchParams(search)
  if (show) {
    params.set(SHOW_SHORT_READ_COVERAGE_PARAM, 'true')
  } else {
    params.delete(SHOW_SHORT_READ_COVERAGE_PARAM)
  }
  return params.toString()
}

export const shouldShowShortReadCoverageContext = (
  search: string,
  datasetId: DatasetId,
  region: CoverageContextRegion
) =>
  isShortReadCoverageContextEligible(datasetId, region) &&
  new URLSearchParams(search).get(SHOW_SHORT_READ_COVERAGE_PARAM) === 'true'
