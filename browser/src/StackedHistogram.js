import { max, sum } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
import PropTypes from 'prop-types'
import React from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft, AxisRight } from '@vx/axis'

import { TooltipAnchor } from '@gnomad/ui'

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
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

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const StackedHistogram = ({
  bins,
  values,
  secondaryValues,
  id,
  xLabel,
  yLabel,
  secondaryYLabel,
  height,
  width,
  barColors,
  formatTooltip,
}) => {
  const yDomain = [0, max(values.map(v => sum(v))) || 1]
  const secondaryYDomain = secondaryValues ? [0, max(secondaryValues.map(v => sum(v))) || 1] : null

  const margin = {
    bottom: 60,
    left: 60,
    right: secondaryValues ? 60 : 10,
    top: 15,
  }
  const plotWidth = width - (margin.left + margin.right)
  const plotHeight = height - (margin.top + margin.bottom)

  const xBandScale = scaleBand().domain(bins).range([0, plotWidth])

  const yScale = scaleLinear().domain(yDomain).range([plotHeight, 0])
  const secondaryYScale = secondaryYDomain
    ? scaleLinear().domain(secondaryYDomain).range([plotHeight, 0])
    : null

  const bandWidth = xBandScale.bandwidth()

  const renderStackedBar = (binValues, scale, { x, barWidth, ...segmentProps }) => {
    const barY = scale(sum(binValues))
    let offset = 0

    return (
      <>
        {binValues.map((value, valueIndex) => {
          const segmentY = scale(value) - offset
          const segmentHeight = plotHeight - segmentY - offset
          offset += segmentHeight
          return (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={valueIndex}>
              <rect
                {...segmentProps}
                x={x}
                y={segmentY}
                height={segmentHeight}
                width={barWidth}
                fill={barColors[valueIndex]}
              />
              <line
                x1={x}
                x2={x + barWidth}
                y1={segmentY + segmentHeight}
                y2={segmentY + segmentHeight}
                stroke="#666"
                strokeWidth={0.5}
              />
            </React.Fragment>
          )
        })}
        <rect
          x={x}
          y={barY}
          height={plotHeight - barY}
          width={barWidth}
          fill="none"
          stroke="#333"
        />
      </>
    )
  }

  return (
    <svg id={id} height={height} width={width}>
      <AxisBottom
        label={xLabel}
        labelOffset={30}
        labelProps={labelProps}
        left={margin.left}
        top={margin.top + plotHeight}
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
        numTicks={Math.min(10, yDomain[1])}
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

      {secondaryValues && (
        <AxisRight
          label={secondaryYLabel}
          labelProps={labelProps}
          left={margin.left + plotWidth}
          numTicks={Math.min(10, secondaryYDomain[1])}
          tickFormat={yTickFormat}
          tickLabelProps={() => ({
            dx: '0.25em',
            dy: '0.25em',
            fill: '#000',
            fontSize: 10,
            textAnchor: 'start',
          })}
          top={margin.top}
          scale={secondaryYScale}
          stroke="#333"
        />
      )}

      <defs>
        <pattern
          id={`${id}-stripes`}
          width={4}
          height={4}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={3} height={4} transform="translate(0,0)" fill="#fff" />
        </pattern>
        <mask id={`${id}-mask`}>
          <rect x={0} y={0} width="100%" height="100%" fill={`url(#${id}-stripes)`} />
        </mask>
      </defs>

      <g transform={`translate(${margin.left},${margin.top})`}>
        {bins.map((bin, binIndex) => {
          return (
            <g key={bin} transform={`translate(${xBandScale(bin)}, 0)`}>
              {secondaryValues ? (
                <>
                  {renderStackedBar(values[binIndex], yScale, {
                    x: bandWidth * 0.125,
                    barWidth: bandWidth * 0.375,
                  })}
                  {renderStackedBar(secondaryValues[binIndex], secondaryYScale, {
                    x: bandWidth * 0.5,
                    barWidth: bandWidth * 0.375,
                    mask: `url(#${id}-mask)`,
                  })}
                </>
              ) : (
                renderStackedBar(values[binIndex], yScale, {
                  x: bandWidth * 0.125,
                  barWidth: bandWidth * 0.75,
                })
              )}

              <TooltipAnchor
                tooltip={formatTooltip(
                  bin,
                  values[binIndex],
                  secondaryValues ? secondaryValues[binIndex] : undefined
                )}
              >
                <BinHoverTarget x={0} y={0} height={plotHeight} width={bandWidth} />
              </TooltipAnchor>
            </g>
          )
        })}
      </g>
    </svg>
  )
}

StackedHistogram.propTypes = {
  bins: PropTypes.arrayOf(PropTypes.string).isRequired,
  values: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  secondaryValues: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  id: PropTypes.string,
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
  secondaryYLabel: PropTypes.string,
  height: PropTypes.number,
  width: PropTypes.number,
  barColors: PropTypes.arrayOf(PropTypes.string),
  formatTooltip: PropTypes.func,
}

StackedHistogram.defaultProps = {
  secondaryValues: undefined,
  id: 'stacked-histogram',
  xLabel: undefined,
  yLabel: undefined,
  secondaryYLabel: undefined,
  height: 250,
  width: 500,
  barColors: [],
  formatTooltip: (bin, values, secondaryValues) => {
    let tooltipText = `${bin}: ${values.map(v => v.toLocaleString()).join(', ')}`
    if (secondaryValues) {
      tooltipText += ` / ${secondaryValues.map(v => v.toLocaleString()).join(', ')}`
    }
    return tooltipText
  },
}

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 1em;
`

export default withSize()(({ size, ...props }) => (
  <GraphWrapper>
    <StackedHistogram {...props} width={size.width} />
  </GraphWrapper>
))
