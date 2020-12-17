import PropTypes from 'prop-types'
import React from 'react'

import { coverageDataset } from '../coverage'
import { referenceGenomeForDataset } from '../datasets'
import { coverageConfigClassic, coverageConfigNew } from '../coverageStyles'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'

const coverageQuery = `
query GeneCoverage($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!, $includeExomeCoverage: Boolean!, $includeGenomeCoverage: Boolean!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
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

const GeneCoverageTrack = ({ datasetId, geneId, includeExomeCoverage, includeGenomeCoverage }) => {
  return (
    <Query
      query={coverageQuery}
      variables={{
        geneId,
        datasetId: coverageDataset(datasetId),
        referenceGenome: referenceGenomeForDataset(coverageDataset(datasetId)),
        includeExomeCoverage,
        includeGenomeCoverage,
      }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={data => {
        if (!data.gene || !data.gene.coverage) {
          return false
        }
        const exomeCoverage = includeExomeCoverage ? data.gene.coverage.exome : true
        const genomeCoverage = includeGenomeCoverage ? data.gene.coverage.genome : true
        return exomeCoverage || genomeCoverage
      }}
    >
      {({ data }) => {
        const exomeCoverage = includeExomeCoverage ? data.gene.coverage.exome : null
        const genomeCoverage = includeGenomeCoverage ? data.gene.coverage.genome : null

        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(exomeCoverage, genomeCoverage)
            : coverageConfigNew(exomeCoverage, genomeCoverage)

        return (
          <CoverageTrack
            coverageOverThresholds={[1, 5, 10, 15, 20, 25, 30, 50, 100]}
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
  includeExomeCoverage: PropTypes.bool,
  includeGenomeCoverage: PropTypes.bool,
}

GeneCoverageTrack.defaultProps = {
  includeExomeCoverage: true,
  includeGenomeCoverage: true,
}

export default GeneCoverageTrack
