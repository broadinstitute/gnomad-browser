import { scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'

import { getCategoryFromConsequence } from '@broad/utilities/src/constants/categoryDefinitions'


const exacClassicColors = {
  all: '#757575',
  missense: '#F0C94D',
  lof: '#FF583F',
  synonymous: 'green',
}


const alleleFrequencyScale = scaleLog()
  .domain([0.000010, 0.001])
  .range([4, 12])


const renderVariant = (variant, x, y) => {
  const fillColor = exacClassicColors[getCategoryFromConsequence(variant.consequence)]
  if (variant.allele_freq === 0) {
    return (
      <circle
        key={variant.variant_id}
        cx={x}
        cy={y}
        r={1}
        fill={'white'}
        stroke={'black'}
        strokeWidth={0.5}
      />
    )
  }
  return (
    <ellipse
      key={variant.variant_id}
      cx={x}
      cy={y}
      ry={alleleFrequencyScale(variant.allele_freq)}
      rx={3}
      fill={fillColor}
      opacity={0.7}
      stroke={'black'}
      strokeWidth={0.5}
    />
  )
}


export const VariantAlleleFrequencyPlot = ({
  height,
  positionOffset,
  variants,
  width,
  xScale,
}) => {
  const markerY = height / 2
  return (
    <svg height={height} width={width}>
      {variants.map((variant) => {
        const markerX = xScale(positionOffset(variant.pos).offsetPosition)
        return renderVariant(variant, markerX, markerY)
      })}
    </svg>
  )
}

VariantAlleleFrequencyPlot.propTypes = {
  height: PropTypes.number.isRequired,
  positionOffset: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(
    PropTypes.shape({
      allele_freq: PropTypes.number.isRequired,
      consequence: PropTypes.string,
      pos: PropTypes.number.isRequired,
      variant_id: PropTypes.string.isRequired,
    })
  ).isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}
