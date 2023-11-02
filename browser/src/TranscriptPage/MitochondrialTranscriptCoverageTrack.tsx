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

const operationName = 'MitochondrialCoverageInTranscript'
const query = `
query ${operationName}($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  transcript(transcript_id: $transcriptId, reference_genome: $referenceGenome) {
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
  transcriptId: string
}

const MitochondrialTranscriptCoverageTrack = ({ datasetId, transcriptId }: Props) => {
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
      variables={{ transcriptId, datasetId, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => data.transcript && data.transcript.mitochondrial_coverage}
    >
      {({ data }: any) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.transcript.mitochondrial_coverage,
            name: 'mitochondrial genome',
            opacity: 0.7,
          },
        ]

        return (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          <CoverageTrack
            coverageOverThresholds={[100, 1000]}
            datasets={coverage}
            filenameForExport={() => `${transcriptId}_coverage`}
            height={190}
            maxCoverage={3000}
            datasetId={datasetId}
          />
        )
      }}
    </Query>
  )
}

export default MitochondrialTranscriptCoverageTrack
