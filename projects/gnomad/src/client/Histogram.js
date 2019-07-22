import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 1em;
`

const yTickFormat = n => {
  if (n >= 1e9) {
    return `${(n / 1e9).toPrecision(3)}B`
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toPrecision(3)}M`
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toPrecision(3)}K`
  }
  return `${n}`
}

const margin = {
  bottom: 55,
  left: 60,
  right: 10,
  top: 10,
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const Histogram = withSize()(
  ({ barColor, binEdges, binValues, nLarger, nSmaller, size: { width }, xLabel, yLabel }) => {
    const height = 250

    const bins = binValues.map((n, i) => ({
      label: `${binEdges[i]}-${binEdges[i + 1]}`,
      value: n,
    }))

    if (nSmaller !== undefined) {
      bins.unshift({
        label: `< ${binEdges[0]}`,
        value: nSmaller,
      })
    }

    if (nLarger !== undefined) {
      bins.push({
        label: `> ${binEdges[binEdges.length - 1]}`,
        value: nLarger,
      })
    }

    const yDomain = [0, max(bins, bin => bin.value) || 1]

    const xBandScale = scaleBand()
      .domain(bins.map(bin => bin.label))
      .range([0, width - (margin.left + margin.right)])

    const yScale = scaleLinear()
      .domain(yDomain)
      .range([height - (margin.top + margin.bottom), margin.top])

    const bandWidth = xBandScale.bandwidth()

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label={xLabel}
            labelOffset={25}
            labelProps={labelProps}
            left={margin.left}
            top={height - margin.bottom}
            scale={xBandScale}
            stroke="#333"
            tickLabelProps={value => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
              transform: `translate(0, 0), rotate(-40 ${xBandScale(value) + bandWidth / 2}, 0)`,
            })}
            tickLength={3}
          />
          <AxisLeft
            label={yLabel}
            labelProps={labelProps}
            left={margin.left}
            tickFormat={yTickFormat}
            tickLabelProps={() => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
            })}
            top={margin.top}
            scale={yScale}
            stroke="#333"
          />
          <g transform={`translate(${margin.left},${margin.top})`}>
            {bins.map(bin => (
              <rect
                key={bin.label}
                x={xBandScale(bin.label)}
                y={yScale(bin.value)}
                height={yScale(0) - yScale(bin.value)}
                width={bandWidth}
                fill={barColor}
                stroke="#333"
              />
            ))}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

Histogram.displayName = 'Histogram'

Histogram.propTypes = {
  barColor: PropTypes.string,
  binEdges: PropTypes.arrayOf(PropTypes.number).isRequired,
  binValues: PropTypes.arrayOf(PropTypes.number).isRequired,
  nLarger: PropTypes.number,
  nSmaller: PropTypes.number,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
}

Histogram.defaultProps = {
  barColor: '#428bca',
  nLarger: undefined,
  nSmaller: undefined,
  xLabel: undefined,
  yLabel: undefined,
}

export default Histogram
