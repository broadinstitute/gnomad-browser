import { max } from 'd3-array'
import { scaleBand, scaleLinear } from 'd3-scale'
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
  height: 100%;
  margin-bottom: 1em;
`

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

const yTickFormat = (n: any) => {
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
  bottom: 60,
  left: 60,
  right: 10,
  top: 10,
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const Histogram = withSize()(
  ({
    // @ts-expect-error TS(2339) FIXME: Property 'barColor' does not exist on type '{}'.
    barColor,
    // @ts-expect-error TS(2339) FIXME: Property 'binEdges' does not exist on type '{}'.
    binEdges,
    // @ts-expect-error TS(2339) FIXME: Property 'binValues' does not exist on type '{}'.
    binValues,
    // @ts-expect-error TS(2339) FIXME: Property 'formatTooltip' does not exist on type '{... Remove this comment to see the full error message
    formatTooltip,
    // @ts-expect-error TS(2339) FIXME: Property 'nLarger' does not exist on type '{}'.
    nLarger,
    // @ts-expect-error TS(2339) FIXME: Property 'nSmaller' does not exist on type '{}'.
    nSmaller,
    // @ts-expect-error TS(2339) FIXME: Property 'size' does not exist on type '{}'.
    size: { width },
    // @ts-expect-error TS(2339) FIXME: Property 'xLabel' does not exist on type '{}'.
    xLabel,
    // @ts-expect-error TS(2339) FIXME: Property 'yLabel' does not exist on type '{}'.
    yLabel,
  }) => {
    const height = 250

    // @ts-expect-error TS(7006) FIXME: Parameter 'n' implicitly has an 'any' type.
    const bins = binValues.map((n, i) => ({
      label: `${binEdges[i]}-${binEdges[i + 1]}`,
      value: n,
    }))

    if (!(nSmaller === undefined || nSmaller === null)) {
      bins.unshift({
        label: `< ${binEdges[0]}`,
        value: nSmaller,
      })
    }

    if (!(nLarger === undefined || nLarger === null)) {
      bins.push({
        label: `> ${binEdges[binEdges.length - 1]}`,
        value: nLarger,
      })
    }

    const yDomain = [0, max(bins, (bin: any) => bin.value) || 1]

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const xBandScale = scaleBand()
      .domain(bins.map((bin: any) => bin.label))
      .range([0, plotWidth])

    // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number)[]' is not assi... Remove this comment to see the full error message
    const yScale = scaleLinear().domain(yDomain).range([plotHeight, 0])

    const bandWidth = xBandScale.bandwidth()

    return (
      <GraphWrapper>
        <svg height={height} width={width}>
          <AxisBottom
            label={xLabel}
            labelOffset={30}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
            labelProps={labelProps}
            left={margin.left}
            top={margin.top + plotHeight}
            scale={xBandScale}
            stroke="#333"
            tickLabelProps={(value) => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 10,
              textAnchor: 'end',
              // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
              transform: `translate(0, 0), rotate(-40 ${xBandScale(value) + bandWidth / 2}, 0)`,
            })}
            tickLength={3}
          />
          <AxisLeft
            label={yLabel}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
            labelProps={labelProps}
            left={margin.left}
            // @ts-expect-error TS(2345) FIXME: Argument of type 'string | number' is not assignab... Remove this comment to see the full error message
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
          <g transform={`translate(${margin.left},${margin.top})`}>
            {bins.map((bin: any) => (
              <React.Fragment key={bin.label}>
                <rect
                  x={xBandScale(bin.label)}
                  y={yScale(bin.value)}
                  height={plotHeight - yScale(bin.value)}
                  width={bandWidth}
                  fill={barColor}
                  stroke="#333"
                />
                {/* @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: any; }' is not... Remove this comment to see the full error message */}
                <TooltipAnchor tooltip={formatTooltip(bin)}>
                  <BinHoverTarget
                    x={xBandScale(bin.label)}
                    y={0}
                    height={plotHeight}
                    width={bandWidth}
                  />
                </TooltipAnchor>
              </React.Fragment>
            ))}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

Histogram.displayName = 'Histogram'

Histogram.propTypes = {
  // @ts-expect-error TS(2322) FIXME: Type '{ barColor: PropTypes.Requireable<string>; b... Remove this comment to see the full error message
  barColor: PropTypes.string,
  binEdges: PropTypes.arrayOf(PropTypes.number).isRequired,
  binValues: PropTypes.arrayOf(PropTypes.number).isRequired,
  formatTooltip: PropTypes.func,
  nLarger: PropTypes.number,
  nSmaller: PropTypes.number,
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
  xLabel: PropTypes.string,
  yLabel: PropTypes.string,
}

Histogram.defaultProps = {
  // @ts-expect-error TS(2322) FIXME: Type '{ barColor: string; formatTooltip: (bin: any... Remove this comment to see the full error message
  barColor: '#428bca',
  formatTooltip: (bin: any) => `${bin.label}: ${bin.value.toLocaleString()}`,
  nLarger: undefined,
  nSmaller: undefined,
  xLabel: undefined,
  yLabel: undefined,
}

export default Histogram
