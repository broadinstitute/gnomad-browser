import PropTypes from 'prop-types'
import React from 'react'

import { CoverageTrack } from '@broad/track-coverage'

import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query Coverage($geneId: String!, $datasetId: DatasetId!) {
  gene(gene_id: $geneId) {
    composite_transcript {
      exome_coverage(dataset: $datasetId) {
        pos
        mean
      }
      genome_coverage(dataset: $datasetId) {
        pos
        mean
      }
    }
  }
}
`

const GeneCoverageTrack = ({ datasetId, geneId, showExomeCoverage }) => {
  const coverageDatasetId = datasetId === 'exac' ? 'exac' : 'gnomad_r2_1'

  return (
    <Query
      query={coverageQuery}
      variables={{
        geneId,
        datasetId: coverageDatasetId,
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading coverage...</StatusMessage>
        }
        if (error) {
          return <StatusMessage>Unable to load coverage</StatusMessage>
        }

        const exomeCoverage = showExomeCoverage
          ? data.gene.composite_transcript.exome_coverage
          : null
        const genomeCoverage = data.gene.composite_transcript.genome_coverage

        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(exomeCoverage, genomeCoverage)
            : coverageConfigNew(exomeCoverage, genomeCoverage)

        return (
          <CoverageTrack
            datasets={coverageConfig}
            filenameForExport={() => `${geneId}_coverage`}
            height={190}
          />
        )
      }}
    </Query>
  )
}

GeneCoverageTrack.propTypes = {
  datasetId: PropTypes.string.isRequired,
  geneId: PropTypes.string.isRequired,
  showExomeCoverage: PropTypes.bool,
}

GeneCoverageTrack.defaultProps = {
  showExomeCoverage: true,
}

export default GeneCoverageTrack
