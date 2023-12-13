import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
// import CoverageTrack from '../CoverageTrack'
import Query from '../Query'
import DiscreteBarPlot from '../DiscreteBarPlot'

type OwnProps = {
  datasetId: string
  chrom: string
  start: number
  stop: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof CopyNumberVariantsGenePercentCallableTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'CopyNumberVariantsGenePercentCallableTrack' implicitly has type '... Remove this comment to see the full error message
const CopyNumberVariantsGenePercentCallableTrack = ({ datasetId, geneId }: Props) => {
  const operationName = 'CopyNumberVariantsGenePercentCallableTrack'
  const query = `
  query ${operationName}($geneId: String!, $datasetId: CopyNumberVariantDatasetId!, $referenceGenome: ReferenceGenomeId!) {
    gene(gene_id: $geneId, reference_genome: $referenceGenome) {
            cnv_track_callable_coverage(dataset: $datasetId) {
                xpos
                percent_callable
                position
                contig
            }
            start
            stop
            chrom
        }
    }
`
  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ geneId, datasetId, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => {
        if (!data.gene || !data.gene.cnv_track_callable_coverage) {
          return false
        }
        return data.gene && data.gene.cnv_track_callable_coverage
      }}
    >
      {({ data }: any) => {
        const transformedArray = data.gene.cnv_track_callable_coverage.map((item: any) => ({
          pos: item.position,
          percent_callable: item.percent_callable,
          xpos: item.xpos,
        }))
        transformedArray.sort((a: any, b: any) => a.xpos - b.xpos)

        const coverage = [
          {
            color: 'rgb(70, 130, 180)',
            buckets: transformedArray,
            name: 'percent callable',
            opacity: 0.7,
          },
        ]
        const geneStart = data.gene.start
        const geneStop = data.gene.stop
        const geneChrom = Number(data.gene.chrom)

        return (
          <DiscreteBarPlot
            datasets={coverage}
            height={200}
            regionStart={geneStart}
            regionStop={geneStop}
            chrom={geneChrom}
          />
        )
      }}
    </Query>
  )
}

export default CopyNumberVariantsGenePercentCallableTrack
