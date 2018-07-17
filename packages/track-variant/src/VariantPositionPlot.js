import PropTypes from 'prop-types'
import React from 'react'


export const VariantPositionPlot = ({
  height,
  positionOffset,
  variantColor,
  variants,
  width,
  xScale,
}) => {
  const markerY = height / 2
  return (
    <svg height={height} width={width}>
      {variants.map((variant) => {
        const markerX = xScale(positionOffset(variant.pos).offsetPosition)
        return (
          <circle
            key={variant.variant_id}
            cx={markerX}
            cy={markerY}
            r={3}
            fill={variantColor}
            stroke={'black'}
            strokeWidth={1}
          />
        )
      })}
    </svg>
  )
}

VariantPositionPlot.propTypes = {
  height: PropTypes.number.isRequired,
  positionOffset: PropTypes.func.isRequired,
  variantColor: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}
