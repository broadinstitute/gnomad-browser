import PropTypes from 'prop-types'
import React from 'react'

import { coverageDataset } from '../coverage'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'

const coverageQuery = `
query RegionCoverage($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
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
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={data => {
        if (!data.region || !data.region.coverage) {
          return false
        }
        const exomeCoverage = includeExomeCoverage ? data.region.coverage.exome : true
        const genomeCoverage = includeGenomeCoverage ? data.region.coverage.genome : true
        return exomeCoverage || genomeCoverage
      }}
    >
      {({ data }) => {
        const exomeCoverage = includeExomeCoverage ? data.region.coverage.exome : null
        const genomeCoverage = includeGenomeCoverage ? data.region.coverage.genome : null

        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(exomeCoverage, genomeCoverage)
            : coverageConfigNew(exomeCoverage, genomeCoverage)

        return (
          <CoverageTrack
            coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
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
