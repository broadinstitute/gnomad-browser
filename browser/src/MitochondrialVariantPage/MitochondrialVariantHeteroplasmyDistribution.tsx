import { sum } from 'd3-array'
import React from 'react'

import StackedHistogram from '../StackedHistogram'

type Props = {
  variant: {
    heteroplasmy_distribution: {
      bin_edges: number[]
      bin_freq: number[]
    }
  }
}

const MitochondrialVariantHeteroplasmyDistribution = ({ variant }: Props) => {
  const binEdges = variant.heteroplasmy_distribution.bin_edges
  const bins = [...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`)
  const values = variant.heteroplasmy_distribution.bin_freq.map((n) => [n])

  return (
    <div>
      {/* spacer to align plot with age distribution */}
      <div style={{ height: '16px', marginBottom: '1em' }} />

      <StackedHistogram
        // @ts-expect-error TS(2322) FIXME: Type '{ id: string; bins: string[]; values: number... Remove this comment to see the full error message
        id="heteroplasmy-distribution-plot"
        bins={bins}
        values={values}
        xLabel="Heteroplasmy level"
        yLabel="Individuals"
        barColors={['#73ab3d']}
        formatTooltip={(bin: any, individualsInBin: any) => {
          const nIndividuals = sum(individualsInBin)
          return `${nIndividuals.toLocaleString()} individual${
            nIndividuals === 1 ? ' has' : 's have'
          } a heteroplasmy level in the ${bin} range`
        }}
      />
    </div>
  )
}

export default MitochondrialVariantHeteroplasmyDistribution
