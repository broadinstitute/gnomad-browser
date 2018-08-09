import { symbol, symbolStar } from 'd3-shape'
import PropTypes from 'prop-types'
import React from 'react'


const layoutStackedPoints = (dataLayers, scale, spacing) => {
  const rows = []

  dataLayers.forEach((layerPoints) => {
    layerPoints.forEach((dataPoint) => {
      const pointPosition = scale(dataPoint)

      let rowIndex = rows.findIndex(
        rowPoints => rowPoints.every(
          point => Math.abs(point.x - pointPosition) >= spacing
        )
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
  positionOffset,
  symbolColor,
  symbolSize,
  symbolSpacing,
  symbolType,
  variantLayers,
  width,
  xScale,
}) => {
  const x = variant => xScale(positionOffset(variant.pos).offsetPosition)

  const { points, height } = layoutStackedPoints(variantLayers, x, symbolSpacing)

  const symbolPath = symbol().size(symbolSize).type(symbolType)()

  return (
    <svg height={height} width={width}>
      <g>
        {points.map(point => (
          <path
            key={point.data.variantId}
            d={symbolPath}
            transform={`translate(${point.x},${height - point.y})`}
            fill={symbolColor(point.data)}
            stroke={'none'}
          />
        ))}
      </g>
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke={'#424242'}
      />
    </svg>
  )
}

StackedVariantsPlot.propTypes = {
  positionOffset: PropTypes.func.isRequired,
  symbolColor: PropTypes.func,
  symbolSize: PropTypes.number,
  symbolSpacing: PropTypes.number,
  symbolType: PropTypes.object,
  variantLayers: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        variantId: PropTypes.string.isRequired,
        pos: PropTypes.number.isRequired,
      })
    )
  ).isRequired,
  width: PropTypes.number.isRequired,
  xScale: PropTypes.func.isRequired,
}

StackedVariantsPlot.defaultProps = {
  symbolColor: () => '#000',
  symbolSize: 12,
  symbolSpacing: 6,
  symbolType: symbolStar,
}
