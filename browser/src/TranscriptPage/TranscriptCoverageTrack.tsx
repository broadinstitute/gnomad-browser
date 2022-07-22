import React from 'react'

import { coverageDataset } from '../coverage'
import { referenceGenomeForDataset } from '../datasets'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'

const coverageQuery = `
query TranscriptCoverage($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  transcript(transcript_id: $transcriptId, reference_genome: $referenceGenome) {
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
  datasetId: string
  transcriptId: string
  includeExomeCoverage?: boolean
  includeGenomeCoverage?: boolean
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof TranscriptCoverageTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'TranscriptCoverageTrack' implicitly has type 'any... Remove this comment to see the full error message
const TranscriptCoverageTrack = ({
  datasetId,
  transcriptId,
  includeExomeCoverage,
  includeGenomeCoverage,
}: Props) => {
  return (
    <Query
      query={coverageQuery}
      variables={{
        transcriptId,
        datasetId: coverageDataset(datasetId),
        referenceGenome: referenceGenomeForDataset(coverageDataset(datasetId)),
        includeExomeCoverage,
        includeGenomeCoverage,
      }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => {
        if (!data.transcript || !data.transcript.coverage) {
          return false
        }
        const exomeCoverage = includeExomeCoverage ? data.transcript.coverage.exome : true
        const genomeCoverage = includeGenomeCoverage ? data.transcript.coverage.genome : true
        return exomeCoverage || genomeCoverage
      }}
    >
      {({ data }: any) => {
        const exomeCoverage = includeExomeCoverage ? data.transcript.coverage.exome : null
        const genomeCoverage = includeGenomeCoverage ? data.transcript.coverage.genome : null

        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(exomeCoverage, genomeCoverage)
            : coverageConfigNew(exomeCoverage, genomeCoverage)

        return (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <CoverageTrack
            coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
            datasets={coverageConfig}
            filenameForExport={() => `${transcriptId}_coverage`}
            height={190}
          />
        )
      }}
    </Query>
  )
}

TranscriptCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default TranscriptCoverageTrack
