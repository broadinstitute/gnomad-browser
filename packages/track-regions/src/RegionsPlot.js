import PropTypes from 'prop-types'
import React from 'react'

export const RegionsPlot = ({
  axisColor,
  height,
  regions,
  regionAttributes,
  regionKey,
  scalePosition,
  width,
  ...rest
}) => (
  <svg {...rest} width={width} height={height}>
    <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={axisColor} strokeWidth={1} />
    {regions.map(region => {
      const x1 = scalePosition(region.start)
      const x2 = scalePosition(region.stop)
      const attributes = {
        fill: '#000',
        height,
        stroke: 'none',
        ...regionAttributes(region),
      }

      return (
        <rect
          key={regionKey(region)}
          y={(height - attributes.height) / 2}
          {...attributes}
          x={x1}
          width={x2 - x1}
        />
      )
    })}
  </svg>
)

RegionsPlot.propTypes = {
  axisColor: PropTypes.string,
  height: PropTypes.number.isRequired,
  regions: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  regionAttributes: PropTypes.func,
  regionKey: PropTypes.func,
  scalePosition: PropTypes.func.isRequired,
  width: PropTypes.number.isRequired,
}

RegionsPlot.defaultProps = {
  axisColor: '#bdbdbd',
  regionAttributes: () => ({}),
  regionKey: region => `${region.start}-${region.stop}`,
}
