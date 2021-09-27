import { max } from 'd3-array'
import { scaleBand, scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@vx/axis'

import { TooltipAnchor } from '@gnomad/ui'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%; /* stylelint-disable-line unit-whitelist */
`

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const ShortTandemRepeatRepeatCooccurrencePlot = withSize()(
  ({ maxRepeats, repeatCooccurrence, size: { width }, ranges }) => {
    const height = Math.min(width, 500)

    const margin = {
      bottom: 75,
      left: 80,
      right: 10,
      top: 20,
    }

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const xBinSize = Math.max(1, Math.ceil(maxRepeats[0] / (plotWidth / 10)))
    const xNumBins = Math.floor(maxRepeats[0] / xBinSize) + 1

    const yBinSize = Math.max(1, Math.ceil(maxRepeats[1] / (plotHeight / 10)))
    const yNumBins = Math.floor(maxRepeats[1] / yBinSize) + 1

    const data = Array.from(Array(xNumBins * yNumBins).keys()).map(n => {
      const xBinIndex = Math.floor(n / yNumBins)
      const yBinIndex = n % yNumBins

      const xLabel =
        xBinSize === 1
          ? `${xBinIndex}`
          : `${xBinIndex * xBinSize} - ${xBinIndex * xBinSize + xBinSize - 1}`
      const yLabel =
        yBinSize === 1
          ? `${yBinIndex}`
          : `${yBinIndex * yBinSize} - ${yBinIndex * yBinSize + yBinSize - 1}`

      return {
        label: `${xLabel} repeats / ${yLabel} repeats`,
        xBinIndex,
        yBinIndex,
        count: 0,
      }
    })

    repeatCooccurrence.forEach(([repeats1, repeats2, nAlleles]) => {
      const xBinIndex = Math.floor(repeats1 / xBinSize)
      const yBinIndex = Math.floor(repeats2 / yBinSize)
      data[xBinIndex * yNumBins + yBinIndex].count += nAlleles
    })

    const xScale = scaleBand()
      .domain(Array.from(Array(xNumBins).keys()))
      .range([0, plotWidth])
    const xBandwidth = xScale.bandwidth()

    const yScale = scaleBand()
      .domain(Array.from(Array(yNumBins).keys()))
      .range([plotHeight, 0])
    const yBandwidth = yScale.bandwidth()

    const xMaxNumLabels = Math.floor(plotWidth / 20)
    const xLabelInterval = Math.max(Math.round(xNumBins / xMaxNumLabels), 1)

    const xTickFormat = binIndex => {
      if (binIndex % xLabelInterval !== 0) {
        return ''
      }

      if (xBinSize === 1) {
        return `${binIndex}`
      }

      return `${binIndex * xBinSize} - ${binIndex * xBinSize + xBinSize - 1}`
    }

    const yTickFormat = binIndex => {
      if (yBinSize === 1) {
        return `${binIndex}`
      }

      return `${binIndex * yBinSize} - ${binIndex * yBinSize + yBinSize - 1}`
    }

    const opacityScale = scaleLog()
      .domain([1, max(repeatCooccurrence, d => d[2])])
      .range([0.1, 1])

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={xBinSize === 1 ? 10 : 40}
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={xTickFormat}
            tickLabelProps={
              xBinSize === 1
                ? () => {
                    return {
                      dy: '0.25em',
                      fill: '#000',
                      fontSize: 10,
                      textAnchor: 'middle',
                    }
                  }
                : binIndex => {
                    return {
                      dx: '-0.75em',
                      dy: '0.2em',
                      fill: '#000',
                      fontSize: 10,
                      textAnchor: 'end',
                      transform: `translate(0, 0), rotate(-40 ${
                        xScale(binIndex) + xBandwidth / 2
                      }, 0)`,
                    }
                  }
            }
            top={height - margin.bottom}
          />
          <AxisLeft
            label="Repeats"
            labelOffset={60}
            labelProps={labelProps}
            left={margin.left}
            scale={yScale}
            stroke="#333"
            tickFormat={yTickFormat}
            tickLabelProps={() => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
            })}
            top={margin.top}
          />

          <g transform={`translate(${margin.left},${margin.top})`}>
            {data.map(d => {
              return (
                <React.Fragment key={`${d.xBinIndex}-${d.yBinIndex}`}>
                  <TooltipAnchor
                    tooltip={`${d.label}: ${d.count.toLocaleString()} individual${
                      d.count === 1 ? '' : 's'
                    }`}
                  >
                    <rect
                      x={xScale(d.xBinIndex)}
                      y={yScale(d.yBinIndex)}
                      width={xBandwidth}
                      height={yBandwidth}
                      fill="#73ab3d"
                      opacity={d.count === 0 ? 0 : opacityScale(d.count)}
                      stroke="#333"
                    />
                  </TooltipAnchor>
                </React.Fragment>
              )
            })}
          </g>

          <g transform={`translate(${margin.left}, 0)`}>
            {ranges
              .filter(range => range.start !== range.stop)
              .filter(range => range.start <= maxRepeats[0])
              .map((range, rangeIndex) => {
                const startBinIndex = Math.floor(range.start / xBinSize)
                const startX =
                  xScale(startBinIndex) +
                  ((range.start - startBinIndex * xBinSize) / xBinSize) * xBandwidth

                let stopX
                if (range.stop <= maxRepeats[0]) {
                  const stopBinIndex = Math.floor(range.stop / xBinSize)
                  stopX =
                    xScale(stopBinIndex) +
                    ((range.stop - stopBinIndex * xBinSize) / xBinSize) * xBandwidth
                } else {
                  stopX = plotWidth
                }

                let labelPosition = (startX + stopX) / 2
                let labelAnchor = 'middle'
                if (rangeIndex === 0 && stopX < 50) {
                  labelPosition = stopX - 5
                  labelAnchor = 'end'
                }
                if (rangeIndex === ranges.length - 1 && plotWidth - startX < 60) {
                  labelPosition = startX + 5
                  labelAnchor = 'start'
                }

                return (
                  <React.Fragment key={range.label}>
                    {range.start !== 0 && (
                      <line
                        x1={startX}
                        y1={margin.top - 10}
                        x2={startX}
                        y2={margin.top + plotHeight}
                        stroke="#333"
                        strokeDasharray="3 3"
                      />
                    )}
                    <path
                      d={`M ${startX + 1} ${margin.top - 6} L ${startX + 5} ${margin.top - 9} L ${
                        startX + 5
                      } ${margin.top - 3} Z`}
                      fill="#333"
                    />
                    <line
                      x1={startX + 1}
                      y1={margin.top - 6}
                      x2={stopX - 1}
                      y2={margin.top - 6}
                      stroke="#333"
                    />
                    <path
                      d={`M ${stopX - 1} ${margin.top - 6} L ${stopX - 5} ${margin.top - 9} L ${
                        stopX - 5
                      } ${margin.top - 3} Z`}
                      fill="#333"
                    />
                    <text
                      x={labelPosition}
                      y={margin.top - 6}
                      dy="-0.5em"
                      fontSize={10}
                      textAnchor={labelAnchor}
                    >
                      {range.label}
                    </text>
                  </React.Fragment>
                )
              })}
          </g>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {ranges
              .filter(range => range.start !== range.stop)
              .filter(range => range.start <= maxRepeats[1])
              .map(range => {
                const startBinIndex = Math.floor(range.start / yBinSize)
                const startY =
                  yScale(startBinIndex) +
                  (1 - (range.start - startBinIndex * yBinSize) / yBinSize) * yBandwidth

                let stopY
                if (range.stop <= maxRepeats[1]) {
                  const stopBinIndex = Math.floor(range.stop / yBinSize)
                  stopY =
                    yScale(stopBinIndex) +
                    (1 - (range.stop - stopBinIndex * yBinSize) / yBinSize) * yBandwidth
                } else {
                  stopY = 0
                }

                return (
                  <React.Fragment key={range.label}>
                    {range.start !== 0 && (
                      <line
                        x1={0}
                        y1={startY}
                        x2={plotWidth + 10}
                        y2={startY}
                        stroke="#333"
                        strokeDasharray="3 3"
                      />
                    )}
                    <path
                      d={`M ${plotWidth + 6} ${stopY + 1} L ${plotWidth + 3} ${stopY + 5} L ${
                        plotWidth + 9
                      } ${stopY + 5} Z`}
                      fill="#333"
                    />
                    <line
                      x1={plotWidth + 6}
                      y1={startY - 1}
                      x2={plotWidth + 6}
                      y2={stopY + 1}
                      stroke="#333"
                    />
                    <path
                      d={`M ${plotWidth + 6} ${startY - 1} L ${plotWidth + 3} ${startY - 5} L ${
                        plotWidth + 9
                      } ${startY - 5} Z`}
                      fill="#333"
                    />
                    <text
                      x={plotWidth + 2}
                      y={(startY + stopY) / 2}
                      dy="0.33em"
                      fontSize={10}
                      textAnchor="end"
                      pointerEvents="none"
                    >
                      {range.label}
                    </text>
                  </React.Fragment>
                )
              })}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatRepeatCooccurrencePlot.displayName = 'ShortTandemRepeatRepeatCooccurrencePlot'

ShortTandemRepeatRepeatCooccurrencePlot.propTypes = {
  maxRepeats: PropTypes.arrayOf(PropTypes.number).isRequired,
  repeatCooccurrence: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  ranges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
}

ShortTandemRepeatRepeatCooccurrencePlot.defaultProps = {
  ranges: [],
}

export default ShortTandemRepeatRepeatCooccurrencePlot
