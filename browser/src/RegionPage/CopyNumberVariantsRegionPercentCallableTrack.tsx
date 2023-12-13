import React from 'react'

import { referenceGenome } from '@gnomad/dataset-metadata/metadata'
import Query from '../Query'
import DiscreteBarPlot from '../DiscreteBarPlot'

type OwnProps = {
  datasetId: string
  chrom: string
  start: number
  stop: number
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof CopyNumberVariantsRegionPercentCallableTrack.defaultProps

// @ts-expect-error TS(7022) FIXME: 'CopyNumberVariantsRegionPercentCallableTrack' implicitly has type '... Remove this comment to see the full error message
const CopyNumberVariantsRegionPercentCallableTrack = ({ datasetId, chrom, start, stop }: Props) => {
  const operationName = 'CopyNumberVariantsRegionPercentCallableTrack'
  const query = `
  query ${operationName}($datasetId: CopyNumberVariantDatasetId!, $chrom: String!, $start: Int!, $stop: Int!, $referenceGenome: ReferenceGenomeId!) {
    region(chrom: $chrom, start: $start, stop: $stop, reference_genome: $referenceGenome) {
            cnv_track_callable_coverage(dataset: $datasetId) {
                xpos
                percent_callable
                position
                contig
            }
        }
    }
`
  return (
    <Query
      operationName={operationName}
      query={query}
      variables={{ datasetId, chrom, start, stop, referenceGenome: referenceGenome(datasetId) }}
      loadingMessage="Loading coverage"
      loadingPlaceholderHeight={220}
      errorMessage="Unable to load coverage"
      success={(data: any) => {
        return data.region && data.region.cnv_track_callable_coverage
      }}
    >
      {({ data }: any) => {
        const transformedArray = data.region.cnv_track_callable_coverage.map((item: any) => ({
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

        return (
          <DiscreteBarPlot
            datasets={coverage}
            height={200}
            regionStart={start}
            regionStop={stop}
            chrom={Number(chrom)}
          />
        )
      }}
    </Query>
  )
}

export default CopyNumberVariantsRegionPercentCallableTrack
