import React from 'react'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  hasMitochondrialGenomeCoverage,
} from '@gnomad/dataset-metadata/metadata'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const operationName = 'CopyNumberVariantsCoverageInRegion'
const query = `
query ${operationName}($start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    copy_number_variants_coverage(dataset: $datasetId) {
      xpos
      percent_callable
    }
  }
}
`

type Props = {
  datasetId: DatasetId
  chrom: number
  start: number
  stop: number
}

const CopyNumberVariantsRegionCoverageTrack = ({ datasetId, chrom, start, stop }: Props) => {
  if (!hasMitochondrialGenomeCoverage(datasetId)) {
    return (
      <StatusMessage>
        Copy Number Variant exome coverage is not available in {labelForDataset(datasetId)}
      </StatusMessage>
    )
  }

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ datasetId, chrom, start, stop, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => {
        return data.region && data.region.copy_number_variant_coverage
      }}
    >
      {({ data }: any) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.region.copy_number_variant_coverage,
            name: 'copy number variant coverage', // TODO
            opacity: 0.7,
          },
        ]

        return (
          <CoverageTrack
            coverageOverThresholds={[100, 1000]}
            datasets={coverage}
            filenameForExport={() => `${chrom}-${start}-${stop}_coverage`}
            height={190}
            maxCoverage={3000}
            datasetId={datasetId}
          />
        )
      }}
    </Query>
  )
}

export default CopyNumberVariantsRegionCoverageTrack
