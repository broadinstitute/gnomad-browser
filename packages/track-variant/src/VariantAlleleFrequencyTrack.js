import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

import { VariantAlleleFrequencyPlot } from './VariantAlleleFrequencyPlot'

export const VariantAlleleFrequencyTrack = ({ height, title, variants }) => (
  <Track title={title}>
    {({ scalePosition, width }) => (
      <VariantAlleleFrequencyPlot
        height={height}
        scalePosition={scalePosition}
        variants={variants}
        width={width}
      />
    )}
  </Track>
)

VariantAlleleFrequencyTrack.propTypes = {
  height: PropTypes.number,
  title: PropTypes.string,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      allele_freq: PropTypes.number,
      consequence: PropTypes.string,
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
}

VariantAlleleFrequencyTrack.defaultProps = {
  height: 60,
  title: '',
}
