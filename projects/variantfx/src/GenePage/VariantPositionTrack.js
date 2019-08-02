import PropTypes from 'prop-types'
import React from 'react'

import { Track } from '@broad/region-viewer'

const VariantPositionPlot = ({ height, scalePosition, variantColor, variants, width }) => {
  const markerY = height / 2
  return (
    <svg height={height} width={width}>
      {variants.map(variant => (
        <circle
          key={variant.variant_id}
          cx={scalePosition(variant.pos)}
          cy={markerY}
          r={3}
          fill={variantColor}
          stroke="black"
          strokeWidth={1}
        />
      ))}
    </svg>
  )
}

VariantPositionPlot.propTypes = {
  height: PropTypes.number.isRequired,
  scalePosition: PropTypes.func.isRequired,
  variantColor: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number.isRequired,
}

const VariantPositionTrack = ({ height, title, variantColor, variants }) => (
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

export default VariantPositionTrack
