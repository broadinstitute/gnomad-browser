import { max, mean } from 'd3-array'
import { scaleBand, scaleLinear, scaleLog } from 'd3-scale'
import PropTypes from 'prop-types'
import React, { useMemo } from 'react'
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

const TooltipTrigger = styled.rect`
  pointer-events: visible;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
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

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const ShortTandemRepeatRepeatCountsPlot = withSize()(
  ({ maxRepeats, repeats, repeatUnit, size: { width }, scaleType, thresholds }) => {
    const height = 300

    const margin = {
      bottom: 75,
      left: 60,
      right: 10,
      top: 20,
    }

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const binSize = Math.max(1, Math.ceil(maxRepeats / (plotWidth / 10)))
    const nBins = Math.floor(maxRepeats / binSize) + 1

    const data = useMemo(() => {
      const d = Array.from(Array(nBins).keys()).map(n => ({
        binIndex: n,
        label: binSize === 1 ? `${n}` : `${n * binSize} - ${n * binSize + binSize - 1}`,
        count: 0,
      }))

      repeats.forEach(([repeatCount, nAlleles]) => {
        const binIndex = Math.floor(repeatCount / binSize)
        d[binIndex].count += nAlleles
      })

      return d
    }, [repeats, nBins, binSize])

    const xScale = scaleBand()
      .domain(data.map(d => d.binIndex))
      .range([0, plotWidth])

    const xBandwidth = xScale.bandwidth()

    let yScale
    if (scaleType === 'log') {
      const maxLog = Math.ceil(Math.log10(max(data, d => d.count) || 1))
      yScale = scaleLog()
        .domain([1, 10 ** maxLog])
        .range([plotHeight - 10, 0])
    } else {
      yScale = scaleLinear()
        .domain([0, max(data, d => d.count) || 1])
        .range([plotHeight, 0])
    }

    const maxNumLabels = Math.floor(plotWidth / 20)

    const labelInterval = Math.max(Math.round(nBins / maxNumLabels), 1)

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={binSize === 1 ? 10 : 40}
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={binIndex => (binIndex % labelInterval === 0 ? data[binIndex].label : '')}
            tickLabelProps={
              binSize === 1
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
            label="Alleles"
            labelOffset={40}
            labelProps={labelProps}
            left={margin.left}
            scale={yScale}
            stroke="#333"
            tickFormat={
              scaleType === 'log'
                ? n => (Number.isInteger(Math.log10(n)) ? tickFormat(n) : '')
                : tickFormat
            }
            tickLabelProps={() => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
            })}
            top={margin.top}
          />
          {scaleType === 'log' && (
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={margin.top + plotHeight}
              stroke="#333"
              strokeWidth={2}
            />
          )}
          <g transform={`translate(${margin.left},${margin.top})`}>
            {data.map(d => {
              const y = d.count === 0 ? plotHeight : yScale(d.count)
              return (
                <React.Fragment key={`${d.binIndex}`}>
                  <rect
                    x={xScale(d.binIndex)}
                    y={y}
                    height={plotHeight - y}
                    width={xBandwidth}
                    fill="#73ab3d"
                    stroke="#333"
                  />
                  <TooltipAnchor
                    tooltip={`${d.label} repeat${
                      d.label === '1' ? '' : 's'
                    }: ${d.count.toLocaleString()} allele${d.count === 1 ? '' : 's'}`}
                  >
                    <TooltipTrigger
                      x={xScale(d.binIndex)}
                      y={0}
                      height={plotHeight}
                      width={xBandwidth}
                      fill="none"
                      style={{ pointerEvents: 'visible' }}
                    />
                  </TooltipAnchor>
                </React.Fragment>
              )
            })}
          </g>

          <g transform={`translate(${margin.left}, 0)`}>
            {
              [
                ...thresholds,
                {
                  value: 150 / repeatUnit.length,
                  label: 'Read length (150 bp)',
                },
              ]
                .filter(threshold => threshold.value <= maxRepeats)
                .sort(
                  mean(thresholds.map(threshold => threshold.value)) < maxRepeats / 2
                    ? (t1, t2) => t1.value - t2.value
                    : (t1, t2) => t2.value - t1.value
                )
                .reduce(
                  (acc, threshold) => {
                    const labelWidth = 100

                    const binIndex = Math.floor(threshold.value / binSize)
                    const positionWithBin = (threshold.value - binIndex * binSize) / binSize
                    // Read length line should be drawn at the center of the range for its value.
                    // Other thresholds are drawn at the left edge since they delimit a range greater than or equal to the threshold value.
                    const thresholdX =
                      xScale(binIndex) +
                      positionWithBin * xBandwidth +
                      (threshold.label === 'Read length (150 bp)' ? xBandwidth / binSize / 2 : 0)

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
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatRepeatCountsPlot.displayName = 'ShortTandemRepeatRepeatCountsPlot'

ShortTandemRepeatRepeatCountsPlot.propTypes = {
  maxRepeats: PropTypes.number.isRequired,
  repeats: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  repeatUnit: PropTypes.string.isRequired,
  scaleType: PropTypes.oneOf(['linear', 'log']),
  thresholds: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    })
  ),
}

ShortTandemRepeatRepeatCountsPlot.defaultProps = {
  scaleType: 'linear',
  thresholds: [],
}

export default ShortTandemRepeatRepeatCountsPlot
