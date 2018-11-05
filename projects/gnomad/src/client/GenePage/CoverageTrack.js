import React from 'react'

import CoverageTrack from '@broad/track-coverage'
import { coverageConfigClassic, coverageConfigNew } from '@broad/region-viewer'

import { Query } from '../Query'
import StatusMessage from '../StatusMessage'

const coverageQuery = `
query Coverage($geneId: String!, $exomeCoverageDatasetId: DatasetsSupportingFetchExomeCoverageByTranscript!, $genomeCoverageDatasetId: DatasetsSupportingFetchGenomeCoverageByTranscript!) {
  gene(gene_id: $geneId) {
    transcript {
      ex_coverage(dataset: $exomeCoverageDatasetId) {
        pos
        mean
      }
      ge_coverage(dataset: $genomeCoverageDatasetId) {
        pos
        mean
      }
    }
  }
}
`

export default ({ datasetId, geneId, ...props }) => {
  const coverageDatasetId = datasetId === 'exac' ? 'exac' : 'gnomad_r2_1'

  return (
    <Query
      query={coverageQuery}
      variables={{
        geneId,
        exomeCoverageDatasetId: coverageDatasetId,
        genomeCoverageDatasetId: coverageDatasetId,
      }}
    >
      {({ data, error, loading }) => {
        if (loading) {
          return <StatusMessage>Loading coverage...</StatusMessage>
        }
        if (error) {
          return <StatusMessage>Unable to load coverage</StatusMessage>
        }

        const exomeCoverage = data.gene.transcript.ex_coverage
        const genomeCoverage = data.gene.transcript.ge_coverage

        const coverageConfig =
          datasetId === 'exac'
            ? coverageConfigClassic(exomeCoverage)
            : coverageConfigNew(exomeCoverage, genomeCoverage)

        return (
          <CoverageTrack
            {...props} // forward props from RegionViewer
            title={'Coverage'}
            height={200}
            dataConfig={coverageConfig}
            yTickNumber={11}
            yMax={110}
          />
        )
      }}
    </Query>
  )
}
