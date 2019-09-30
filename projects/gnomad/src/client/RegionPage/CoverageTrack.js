import PropTypes from 'prop-types'
import React from 'react'

import { CoverageTrack } from '@broad/track-coverage'

import { coverageDataset } from '../coverage'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query RegionCoverage($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!) {
  region(chrom: $chrom, start: $start, stop: $stop) {
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

const RegionCoverageTrack = ({ datasetId, chrom, showExomeCoverage, start, stop }) => {
  return (
    <Query
      query={coverageQuery}
      variables={{
        chrom,
        start,
        stop,
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

        const exomeCoverage = showExomeCoverage ? data.region.exome_coverage : null
        const genomeCoverage = data.region.genome_coverage

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
            filenameForExport={() => `${chrom}-${start}-${stop}_coverage`}
            height={200}
          />
        )
      }}
    </Query>
  )
}

RegionCoverageTrack.propTypes = {
  datasetId: PropTypes.string.isRequired,
  chrom: PropTypes.string.isRequired,
  showExomeCoverage: PropTypes.bool,
  start: PropTypes.number.isRequired,
  stop: PropTypes.number.isRequired,
}

RegionCoverageTrack.defaultProps = {
  showExomeCoverage: true,
}

export default RegionCoverageTrack
