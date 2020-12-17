import PropTypes from 'prop-types'
import React from 'react'

import { referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import CoverageTrack from '../CoverageTrack'

const query = `
query MitochondrialCoverageInGene($geneId: String!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  gene(gene_id: $geneId, reference_genome: $referenceGenome) {
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

const MitochondrialGeneCoverageTrack = ({ datasetId, geneId }) => {
  return (
    <Query
      query={query}
      variables={{ geneId, datasetId, referenceGenome: referenceGenomeForDataset(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={data => data.gene && data.gene.mitochondrial_coverage}
    >
      {({ data }) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.gene.mitochondrial_coverage,
            name: 'mitochondrial genome',
            opacity: 0.7,
          },
        ]

        return (
          <CoverageTrack
            coverageOverThresholds={[100, 1000]}
            datasets={coverage}
            filenameForExport={() => `${geneId}_coverage`}
            height={190}
            maxCoverage={3000}
          />
        )
      }}
    </Query>
  )
}

MitochondrialGeneCoverageTrack.propTypes = {
  datasetId: PropTypes.string.isRequired,
  geneId: PropTypes.string.isRequired,
}

export default MitochondrialGeneCoverageTrack
