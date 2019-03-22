import { max, min } from 'd3-array'
import { scaleLinear, scaleLog } from 'd3-scale'
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
  height: 100%; /* stylelint-disable-line unit-whitelist */
  margin-bottom: 1em;
`

const tickFormat = n => {
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
  bottom: 50,
  left: 60,
  right: 10,
  top: 10,
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

export const BarGraph = withSize()(
  ({ barColor, bins, highlightValue, logScale, nLarger, nSmaller, size, xLabel, yLabel }) => {
    const height = 250
    const { width } = size

    const binsCopy = [...bins]

    if (nSmaller) {
      binsCopy.unshift({
        x0: binsCopy[0].x0 - (binsCopy[0].x1 - binsCopy[0].x0),
        x1: binsCopy[0].x0,
        n: nSmaller,
      })
    }

    if (nLarger) {
      binsCopy.push({
        x0: binsCopy[binsCopy.length - 1].x1,
        x1:
          binsCopy[binsCopy.length - 1].x1 +
          binsCopy[binsCopy.length - 1].x1 -
          binsCopy[binsCopy.length - 1].x0,
        n: nLarger,
      })
    }

    const xTickFormat = logScale
      ? undefined
      : (val, i) => {
          if (i === 0 && nSmaller) {
            return `<${bins[0].x0}`
          }

          if (i === binsCopy.length && nLarger) {
            return `>${bins[bins.length - 1].x1}`
          }

          return val
        }

    const xDomain = [min(binsCopy, bin => bin.x0), max(binsCopy, bin => bin.x1)]

    const yDomain = [0, max(binsCopy, bin => bin.n) || 1]

    const xScale = (logScale ? scaleLog() : scaleLinear())
      .domain(xDomain)
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
            scale={xScale}
            stroke="#333"
            tickFormat={xTickFormat}
          />
          <AxisLeft
            label={yLabel}
            labelProps={labelProps}
            left={margin.left}
            tickFormat={tickFormat}
            top={margin.top}
            scale={yScale}
            stroke="#333"
          />
          <g transform={`translate(${margin.left},${margin.top})`}>
            {binsCopy.map(bin => (
              <rect
                key={bin.x0}
                x={xScale(bin.x0)}
                y={yScale(bin.n)}
                height={yScale(0) - yScale(bin.n)}
                width={xScale(bin.x1) - xScale(bin.x0)}
                fill={barColor}
                stroke="#333"
              />
            ))}
            {highlightValue !== undefined && (
              <line
                x1={xScale(highlightValue)}
                y1={yScale(yDomain[1])}
                x2={xScale(highlightValue)}
                y2={yScale(0)}
                stroke="#dd2c00"
                strokeWidth={3}
              />
            )}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

BarGraph.displayName = 'BarGraph'

BarGraph.propTypes = {
  barColor: PropTypes.string,
  bins: PropTypes.arrayOf(
    PropTypes.shape({
      x0: PropTypes.number.isRequired,
      x1: PropTypes.number.isRequired,
      n: PropTypes.number.isRequired,
    })
  ),
  highlightValue: PropTypes.number,
  logScale: PropTypes.bool,
  nLarger: PropTypes.number,
  nSmaller: PropTypes.number,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
}

BarGraph.defaultProps = {
  barColor: '#428bca',
  highlightValue: undefined,
  logScale: false,
  nLarger: undefined,
  nSmaller: undefined,
  xLabel: undefined,
  yLabel: undefined,
}
