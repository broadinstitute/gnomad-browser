import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import CoverageTrack from '../CoverageTrack'

const query = `
query MitochondrialCoverageInTranscript($transcriptId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
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

const MitochondrialTranscriptCoverageTrack = ({ datasetId, transcriptId }) => {
  return (
    <Query
      query={query}
      variables={{ transcriptId, datasetId, referenceGenome: referenceGenomeForDataset(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={data => data.transcript && data.transcript.mitochondrial_coverage}
    >
      {({ data }) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.transcript.mitochondrial_coverage,
            name: 'mitochondrial genome',
            opacity: 0.7,
          },
        ]

        return (
          <CoverageTrack
            coverageOverThresholds={[100, 1000]}
            datasets={coverage}
            filenameForExport={() => `${transcriptId}_coverage`}
            height={190}
            maxCoverage={3000}
          />
        )
      }}
    </Query>
  )
}

MitochondrialTranscriptCoverageTrack.propTypes = {
  datasetId: PropTypes.string.isRequired,
  transcriptId: PropTypes.string.isRequired,
}

export default MitochondrialTranscriptCoverageTrack
