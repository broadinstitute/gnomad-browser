import React from 'react'

import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import StatusMessage from '../StatusMessage'

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

type Props = {
  datasetId: string
  geneId: string
}

const MitochondrialGeneCoverageTrack = ({ datasetId, geneId }: Props) => {
  if (datasetId === 'exac' || datasetId.startsWith('gnomad_r2')) {
    return (
      <StatusMessage>
        Mitochondrial genome coverage is not available in {labelForDataset(datasetId)}
      </StatusMessage>
    )
  }

  return (
    <Query
      query={query}
      variables={{ geneId, datasetId, referenceGenome: referenceGenomeForDataset(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => data.gene && data.gene.mitochondrial_coverage}
    >
      {({ data }: any) => {
        const coverage = [
          {
            color: 'rgb(115, 171, 61)',
            buckets: data.gene.mitochondrial_coverage,
            name: 'mitochondrial genome',
            opacity: 0.7,
          },
        ]

        return (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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

export default MitochondrialGeneCoverageTrack
