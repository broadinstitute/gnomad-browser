import PropTypes from 'prop-types'
import React from 'react'


const PositionAxis = ({
  invertOffset,
  width,
}) => {
  const height = 15
  const numIntervals = 10

  const tickInterval = width / numIntervals
  const tickPositions = [...Array(numIntervals - 1)].map((_, i) => tickInterval * (i + 1))

  const ticks = tickPositions.map(x => (
    <g key={`tick-${x}-axis`}>
      <line
        x1={x}
        y1={height}
        x2={x}
        y2={height - 5}
        stroke="black"
        strokeWidth={1}
      />
      <text
        x={x}
        y={height - 7}
        textAnchor="center"
        style={{ fontSize: '10px' }}
      >
        {invertOffset(x)}
      </text>
    </g>
  ))

  return (
    <svg height={height} width={width}>
      <line
        x1={0}
        y1={height}
        x2={width}
        y2={height}
        stroke="black"
        strokeWidth={2}
      />
      <line
        x1={0}
        y1={height - 7}
        x2={0}
        y2={height}
        stroke="black"
        strokeWidth={2}
      />
      <line
        x1={width}
        y1={height - 7}
        x2={width}
        y2={height}
        stroke="black"
        strokeWidth={2}
      />
      {ticks}
    </svg>
  )
}

PositionAxis.propTypes = {
  invertOffset: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
}

export default PositionAxis
