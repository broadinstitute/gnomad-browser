import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

import { VariantPositionPlot } from './VariantPositionPlot'

export const VariantPositionTrack = ({ height, title, variantColor, variants }) => (
  <Track title={title}>
    {({ scalePosition, width }) => (
      <VariantPositionPlot
        height={height}
        scalePosition={scalePosition}
        variantColor={variantColor}
        variants={variants}
        width={width}
      />
    )}
  </Track>
)

VariantPositionTrack.propTypes = {
  height: PropTypes.number,
  title: PropTypes.string,
  variantColor: PropTypes.string,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
}

VariantPositionTrack.defaultProps = {
  height: 10,
  variantColor: '#757575',
  title: '',
}
