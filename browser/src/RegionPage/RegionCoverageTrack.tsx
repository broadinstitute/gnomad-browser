import React from 'react'

import { DatasetId, referenceGenome, coverageDatasetId } from '@gnomad/dataset-metadata/metadata'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const operationName = 'RegionCoverage'
const coverageQuery = `
query ${operationName}($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    coverage(dataset: $datasetId) {
      exome @include(if: $includeExomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
      genome @include(if: $includeGenomeCoverage) {
        pos
        mean
        median
        over_1
        over_5
        over_10
        over_15
        over_20
        over_25
        over_30
        over_50
        over_100
      }
    }
  }
}
`

type OwnProps = {
  datasetId: DatasetId
  chrom: string
  start: number
  stop: number
  includeExomeCoverage?: boolean
  includeGenomeCoverage?: boolean
  viewStart?: number
  viewStop?: number
  metricControlId?: string
  exomeLabel?: string
  genomeLabel?: string
  filenameForExport?: string
  errorMessage?: string
  unavailableMessage?: string
  height?: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof RegionCoverageTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'RegionCoverageTrack' implicitly has type 'any' be... Remove this comment to see the full error message
const RegionCoverageTrack = ({
  datasetId,
  chrom,
  start,
  stop,
  includeExomeCoverage,
  includeGenomeCoverage,
  viewStart,
  viewStop,
  metricControlId,
  exomeLabel,
  genomeLabel,
  filenameForExport,
  errorMessage,
  unavailableMessage,
  height,
}: Props) => {
  const viewportStart = viewStart ?? start
  const viewportStop = viewStop ?? stop

  return (
    <Query
      operationName={operationName}
      query={coverageQuery}
      variables={{
        chrom,
        start,
        stop,
        datasetId: coverageDatasetId(datasetId),
        referenceGenome: referenceGenome(coverageDatasetId(datasetId)),
        includeExomeCoverage,
        includeGenomeCoverage,
      }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage={errorMessage}
      success={(data: any) => Boolean(data.region && data.region.coverage)}
    >
      {({ data }: any) => {
        const filterToViewport = (buckets: any) =>
          Array.isArray(buckets)
            ? buckets.filter(
                (bucket: any) => bucket.pos >= viewportStart && bucket.pos <= viewportStop
              )
            : []
        const exomeCoverage = includeExomeCoverage
          ? filterToViewport(data.region.coverage.exome)
          : []
        const genomeCoverage = includeGenomeCoverage
          ? filterToViewport(data.region.coverage.genome)
          : []
        if (exomeCoverage.length === 0 && genomeCoverage.length === 0) {
          return <StatusMessage>{unavailableMessage}</StatusMessage>
        }

        const nonEmptyExomeCoverage = exomeCoverage.length > 0 ? exomeCoverage : null
        const nonEmptyGenomeCoverage = genomeCoverage.length > 0 ? genomeCoverage : null
        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(nonEmptyExomeCoverage, nonEmptyGenomeCoverage)
            : coverageConfigNew(nonEmptyExomeCoverage, nonEmptyGenomeCoverage)
        const labeledCoverageConfig = coverageConfig.map((config) => ({
          ...config,
          name: config.name === 'exome' ? exomeLabel : genomeLabel,
        }))

        return (
          <CoverageTrack
            coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
            filenameForExport={() => filenameForExport || `${chrom}-${start}-${stop}_coverage`}
            datasets={labeledCoverageConfig}
            height={height}
            datasetId={datasetId}
            metricControlId={metricControlId}
          />
        )
      }}
    </Query>
  )
}

RegionCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
  viewStart: undefined,
  viewStop: undefined,
  metricControlId: 'coverage-metric',
  exomeLabel: 'exome',
  genomeLabel: 'genome',
  filenameForExport: undefined,
  errorMessage: 'Unable to load coverage',
  unavailableMessage: 'Coverage is unavailable in this region.',
  height: 200,
}

export default RegionCoverageTrack
