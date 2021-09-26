import { max, mean } from 'd3-array'
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
  ({ maxRepeats, repeatCooccurrence, size: { width }, thresholds }) => {
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
            {
              thresholds
                .filter(threshold => threshold.value <= maxRepeats[0])
                .sort(
                  mean(thresholds.map(threshold => threshold.value)) < maxRepeats / 2
                    ? (t1, t2) => t1.value - t2.value
                    : (t1, t2) => t2.value - t1.value
                )
                .reduce(
                  (acc, threshold) => {
                    const labelWidth = 100

                    const binIndex = Math.floor(threshold.value / xBinSize)
                    const positionWithBin = (threshold.value - binIndex * xBinSize) / xBinSize
                    const thresholdX = xScale(binIndex) + positionWithBin * xBandwidth

                    const labelAnchor = thresholdX >= labelWidth ? 'end' : 'start'

                    const yOffset =
                      Math.abs(thresholdX - acc.previousX) > labelWidth
                        ? 0
                        : acc.previousYOffset + 12

                    const element = (
                      <g key={threshold.label}>
                        <line
                          x1={thresholdX}
                          y1={yOffset + 2}
                          x2={thresholdX}
                          y2={height - margin.bottom}
                          stroke="#333"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={thresholdX}
                          y={yOffset}
                          dx={labelAnchor === 'end' ? -5 : 5}
                          dy="0.75em"
                          fill="#000"
                          fontSize={10}
                          textAnchor={labelAnchor}
                        >
                          {threshold.label}
                        </text>
                      </g>
                    )

                    return {
                      previousX: thresholdX,
                      previousYOffset: yOffset,
                      elements: [element, ...acc.elements],
                    }
                  },
                  {
                    previousX: Infinity,
                    previousYOffset: 0,
                    elements: [],
                  }
                ).elements
            }
          </g>

          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {thresholds
              .filter(threshold => threshold.value <= maxRepeats[1])
              .map((threshold, i) => {
                const binIndex = Math.floor(threshold.value / yBinSize)
                const positionWithBin = (threshold.value - binIndex * yBinSize) / yBinSize
                const thresholdY = yScale(binIndex) + (1 - positionWithBin) * yBandwidth

                return (
                  <g key={threshold.label}>
                    <line
                      x1={0}
                      y1={thresholdY}
                      x2={plotWidth}
                      y2={thresholdY}
                      stroke="#333"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={plotWidth}
                      y={thresholdY}
                      dy={i % 2 === 0 ? '1.1em' : '-0.5em'}
                      fill="#000"
                      fontSize={10}
                      textAnchor="end"
                      pointerEvents="none"
                    >
                      {threshold.label}
                    </text>
                  </g>
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
  thresholds: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ),
}

ShortTandemRepeatRepeatCooccurrencePlot.defaultProps = {
  thresholds: [],
}

export default ShortTandemRepeatRepeatCooccurrencePlot
