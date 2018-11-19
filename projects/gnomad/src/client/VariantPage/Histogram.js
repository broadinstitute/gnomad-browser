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
    return `${(n / 1e9).toFixed(0)}B`
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(0)}M`
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(0)}K`
  }
  return `${n}`
}

const margin = {
  bottom: 50,
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

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label={xLabel}
            labelProps={labelProps}
            left={margin.left}
            top={height - margin.bottom}
            scale={xBandScale}
            stroke="#333"
            tickLength={3}
          />
          <AxisLeft
            label={yLabel}
            labelProps={labelProps}
            left={margin.left}
            tickFormat={yTickFormat}
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
                width={xBandScale.bandwidth()}
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
