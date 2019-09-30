import PropTypes from 'prop-types'
import React from 'react'

import { CoverageTrack } from '@broad/track-coverage'

import { coverageDataset } from '../coverage'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query Coverage($geneId: String!, $datasetId: DatasetId!) {
  gene(gene_id: $geneId) {
    exome_coverage(dataset: $datasetId) {
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
    genome_coverage(dataset: $datasetId) {
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
`

const GeneCoverageTrack = ({ datasetId, geneId, showExomeCoverage }) => {
  return (
    <Query
      query={coverageQuery}
      variables={{
        geneId,
        datasetId: coverageDataset(datasetId),
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading coverage...</StatusMessage>
        }
        if (error) {
          return <StatusMessage>Unable to load coverage</StatusMessage>
        }

        const exomeCoverage = showExomeCoverage ? data.gene.exome_coverage : null
        const genomeCoverage = data.gene.genome_coverage

        if (!exomeCoverage && !genomeCoverage) {
          return <StatusMessage>Unable to load coverage</StatusMessage>
        }

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
