import { symbol, symbolStar } from 'd3-shape'
import PropTypes from 'prop-types'
import React from 'react'

import { TooltipAnchor } from '@broad/ui'

const layoutStackedPoints = (dataLayers, scale, spacing) => {
  const rows = []

  dataLayers.forEach(layerPoints => {
    layerPoints.forEach(dataPoint => {
      const pointPosition = scale(dataPoint)

      let rowIndex = rows.findIndex(rowPoints =>
        rowPoints.every(point => Math.abs(point.x - pointPosition) >= spacing)
      )

      if (rowIndex === -1) {
        rows.push([])
        rowIndex = rows.length - 1
      }

      rows[rowIndex].push({
        data: dataPoint,
        x: pointPosition,
        y: spacing * (rowIndex + 0.5),
      })
    })
  })

  return {
    height: rows.length * spacing,
    points: rows.reduce((acc, row) => acc.concat(row), []),
  }
}

export const StackedVariantsPlot = ({
  onClickVariant,
  symbolColor,
  symbolSize,
  symbolSpacing,
  symbolType,
  scalePosition,
  tooltipComponent,
  variantLayers,
  width,
}) => {
  const x = variant => scalePosition(variant.pos)
  const { points, height } = layoutStackedPoints(variantLayers, x, symbolSpacing)

  const symbolPath = symbol()
    .size(symbolSize)
    .type(symbolType)()

  return (
    <svg height={height} width={width}>
      <g>
        {points.map(point => (
          <TooltipAnchor
            key={point.data.variantId}
            tooltipComponent={tooltipComponent}
            variant={point.data}
          >
            <path
              d={symbolPath}
              transform={`translate(${point.x},${height - point.y})`}
              fill={symbolColor(point.data)}
              stroke="none"
              onClick={() => onClickVariant(point.data)}
            />
          </TooltipAnchor>
        ))}
      </g>
      <line x1={0} y1={height} x2={width} y2={height} stroke="#424242" />
    </svg>
  )
}

StackedVariantsPlot.propTypes = {
  onClickVariant: PropTypes.func,
  scalePosition: PropTypes.func.isRequired,
  symbolColor: PropTypes.func,
  symbolSize: PropTypes.number,
  symbolSpacing: PropTypes.number,
  symbolType: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  tooltipComponent: PropTypes.func.isRequired,
  variantLayers: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        variantId: PropTypes.string.isRequired,
        pos: PropTypes.number.isRequired,
      })
    )
  ).isRequired,
  width: PropTypes.number.isRequired,
}

StackedVariantsPlot.defaultProps = {
  onClickVariant: () => {},
  symbolColor: () => '#000',
  symbolSize: 12,
  symbolSpacing: 6,
  symbolType: symbolStar,
}
