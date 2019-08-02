import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

import { VariantPlot } from './VariantPlot'

export const VariantTrack = ({ height, title, variants }) => (
  <Track title={title}>
    {({ scalePosition, width }) => (
      <VariantPlot
        height={height}
        scalePosition={scalePosition}
        variants={variants}
        width={width}
      />
    )}
  </Track>
)

VariantTrack.propTypes = {
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

VariantTrack.defaultProps = {
  height: 60,
  title: '',
}
