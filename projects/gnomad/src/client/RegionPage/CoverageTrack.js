import PropTypes from 'prop-types'
import React from 'react'

import { CoverageTrack } from '@broad/track-coverage'

import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query RegionCoverage($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!) {
  region(chrom: $chrom, start: $start, stop: $stop) {
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
`

const RegionCoverageTrack = ({ datasetId, chrom, showExomeCoverage, start, stop }) => {
  const coverageDatasetId = datasetId === 'exac' ? 'exac' : 'gnomad_r2_1'

  return (
    <Query
      query={coverageQuery}
      variables={{
        chrom,
        start,
        stop,
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

        const exomeCoverage = showExomeCoverage ? data.region.exome_coverage : null
        const genomeCoverage = data.region.genome_coverage

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
