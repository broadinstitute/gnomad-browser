import React from 'react'

import {
  DatasetId,
  labelForDataset,
  referenceGenome,
  hasMitochondrialGenomeCoverage,
} from '@gnomad/dataset-metadata/metadata'
import CoverageTrack, { MetricOptions } from '../CoverageTrack'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const operationName = 'MitochondrialCoverageInRegion'
const query = `
query ${operationName}($start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  region(chrom: "M", start: $start, stop: $stop, reference_genome: $referenceGenome) {
    mitochondrial_coverage(dataset: $datasetId) {
      pos
      mean
      median
      over_100
      over_1000
    }
  }
}
`

type Props = {
  datasetId: DatasetId
  start: number
  stop: number
}

const MitochondrialRegionCoverageTrack = ({ datasetId, start, stop }: Props) => {
  if (!hasMitochondrialGenomeCoverage(datasetId)) {
    return (
      <StatusMessage>
        Mitochondrial genome coverage is not available in {labelForDataset(datasetId)}
      </StatusMessage>
    )
  }

  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ datasetId, start, stop, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => {
        return data.region && data.region.mitochondrial_coverage
      }}
    >
      {({ data }: any) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.region.mitochondrial_coverage,
            name: 'mitochondrial genome',
            opacity: 0.7,
          },
        ]

        return (
          <CoverageTrack
            coverageOverThresholds={[100, 1000]}
            datasets={coverage}
            filenameForExport={() => `M-${start}-${stop}_coverage`}
            height={190}
            maxCoverage={3000}
            datasetId={datasetId}
            metric={MetricOptions.mean}
          />
        )
      }}
    </Query>
  )
}

export default MitochondrialRegionCoverageTrack
