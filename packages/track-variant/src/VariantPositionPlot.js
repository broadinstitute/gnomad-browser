import PropTypes from 'prop-types'
import React from 'react'

export const VariantPositionPlot = ({ height, scalePosition, variantColor, variants, width }) => {
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
