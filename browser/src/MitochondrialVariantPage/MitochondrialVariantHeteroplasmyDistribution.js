import { sum } from 'd3-array'
import PropTypes from 'prop-types'
import React from 'react'

import StackedHistogram from '../StackedHistogram'

const MitochondrialVariantHeteroplasmyDistribution = ({ variant }) => {
  const binEdges = variant.heteroplasmy_distribution.bin_edges
  const bins = [...Array(binEdges.length - 1)].map((_, i) => `${binEdges[i]}-${binEdges[i + 1]}`)
  const values = variant.heteroplasmy_distribution.bin_freq.map(n => [n])

  return (
    <div>
      {/* spacer to align plot with age distribution */}
      <div style={{ height: '16px', marginBottom: '1em' }} />

      <StackedHistogram
        id="heteroplasmy-distribution-plot"
        bins={bins}
        values={values}
        xLabel="Heteroplasmy level"
        yLabel="Individuals"
        barColors={['#73ab3d']}
        formatTooltip={(bin, individualsInBin) => {
          const nIndividuals = sum(individualsInBin)
          return `${nIndividuals.toLocaleString()} individual${
            nIndividuals === 1 ? ' has' : 's have'
          } a heteroplasmy level in the ${bin} range`
        }}
      />
    </div>
  )
}

MitochondrialVariantHeteroplasmyDistribution.propTypes = {
  variant: PropTypes.shape({
    heteroplasmy_distribution: PropTypes.shape({
      bin_edges: PropTypes.arrayOf(PropTypes.number).isRequired,
      bin_freq: PropTypes.arrayOf(PropTypes.number).isRequired,
    }).isRequired,
  }).isRequired,
}

export default MitochondrialVariantHeteroplasmyDistribution
