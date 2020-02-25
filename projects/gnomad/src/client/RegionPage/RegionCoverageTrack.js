import PropTypes from 'prop-types'
import React from 'react'

import { CoverageTrack } from '@gnomad/track-coverage'

import { coverageDataset } from '../coverage'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query RegionCoverage($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
    exome_coverage(dataset: $datasetId) @include(if: $includeExomeCoverage) {
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
    genome_coverage(dataset: $datasetId) @include(if: $includeGenomeCoverage) {
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

const RegionCoverageTrack = ({
  datasetId,
  chrom,
  start,
  stop,
  includeExomeCoverage,
  includeGenomeCoverage,
}) => {
  return (
    <Query
      query={coverageQuery}
      variables={{
        chrom,
        start,
        stop,
        datasetId: coverageDataset(datasetId),
        referenceGenome: referenceGenomeForDataset(coverageDataset(datasetId)),
        includeExomeCoverage,
        includeGenomeCoverage,
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading coverage...</StatusMessage>
        }
        if (error) {
          return <StatusMessage>Unable to load coverage</StatusMessage>
        }

        const exomeCoverage = includeExomeCoverage ? data.region.exome_coverage : null
        const genomeCoverage = includeGenomeCoverage ? data.region.genome_coverage : null

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
  start: PropTypes.number.isRequired,
  stop: PropTypes.number.isRequired,
  includeExomeCoverage: PropTypes.bool,
  includeGenomeCoverage: PropTypes.bool,
}

RegionCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default RegionCoverageTrack
