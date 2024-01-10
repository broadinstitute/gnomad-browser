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

const ageRangeLabel = (ageRange: any) => {
  const [minAge, maxAge] = ageRange

  if (minAge === null) {
    return `<${maxAge}`
  }
  if (maxAge === null) {
    return `>${minAge}`
  }
  return `${minAge}-${maxAge}`
}

const ShortTandemRepeatAgeDistributionPlot = withSize()(
  // @ts-expect-error TS(2339) FIXME: Property 'ageDistribution' does not exist on type ... Remove this comment to see the full error message
  ({ ageDistribution, maxRepeats, ranges, size: { width } }) => {
    const height = Math.min(width, 300)

    const margin = {
      bottom: 65,
      left: 60,
      right: 10,
      top: 20,
    }

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const xBinSize = Math.max(1, Math.ceil(maxRepeats / (plotWidth / 10)))
    const xNumBins = Math.floor(maxRepeats / xBinSize) + 1

    const yNumBins = ageDistribution.length

    const data = Array.from(Array(xNumBins * yNumBins).keys()).map((n: any) => {
      const xBinIndex = Math.floor(n / yNumBins)
      const yBinIndex = n % yNumBins

      const xRange =
        xBinSize === 1
          ? [xBinIndex, xBinIndex]
          : [xBinIndex * xBinSize, xBinIndex * xBinSize + xBinSize - 1]

      const xLabel =
        xBinSize === 1
          ? `${xBinIndex}`
          : `${xBinIndex * xBinSize} - ${xBinIndex * xBinSize + xBinSize - 1}`

      return {
        label: `Age ${ageRangeLabel(ageDistribution[yBinIndex].age_range)}, ${xLabel} repeats`,
        xBinIndex,
        yBinIndex,
        xRange,
        count: 0,
      }
    })

    ageDistribution.forEach((ageBin: any, yBinIndex: any) => {
      // @ts-expect-error TS(7031) FIXME: Binding element 'repeats' implicitly has an 'any' ... Remove this comment to see the full error message
      ageBin.distribution.forEach(([repeats, nAlleles]) => {
        const xBinIndex = Math.floor(repeats / xBinSize)
        data[xBinIndex * yNumBins + yBinIndex].count += nAlleles
      })
    })

    const xScale = scaleBand()
      // @ts-expect-error TS(2345) FIXME: Argument of type 'number[]' is not assignable to p... Remove this comment to see the full error message
      .domain(Array.from(Array(xNumBins).keys()))
      .range([0, plotWidth])
    const xBandwidth = xScale.bandwidth()

    const yScale = scaleBand()
      // @ts-expect-error TS(2345) FIXME: Argument of type 'number[]' is not assignable to p... Remove this comment to see the full error message
      .domain(Array.from(Array(yNumBins).keys()))
      .range([plotHeight, 0])
    const yBandwidth = yScale.bandwidth()

    const xMaxNumLabels = Math.floor(plotWidth / 20)
    const xLabelInterval = Math.max(Math.round(xNumBins / xMaxNumLabels), 1)

    const xTickFormat = (binIndex: any) => {
      if (binIndex % xLabelInterval !== 0) {
        return ''
      }

      if (xBinSize === 1) {
        return `${binIndex}`
      }

      return `${binIndex * xBinSize} - ${binIndex * xBinSize + xBinSize - 1}`
    }

    const yTickFormat = (binIndex: any) => {
      return ageRangeLabel(ageDistribution[binIndex].age_range)
    }

    const opacityScale = scaleLog()
      // @ts-expect-error TS(2345) FIXME: Argument of type '(string | number | undefined)[]'... Remove this comment to see the full error message
      .domain([
        1,
        max(ageDistribution, (ageBin: any) => max(ageBin.distribution, (d: any) => d[1])),
      ])
      .range([0.1, 1])

    return (
      <GraphWrapper>
        <svg height={xBinSize === 1 ? height - 20 : height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={xBinSize === 1 ? 10 : 30}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
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
                : (binIndex) => {
                    return {
                      dx: '-0.75em',
                      dy: '0.2em',
                      fill: '#000',
                      fontSize: 10,
                      textAnchor: 'end',
                      transform: `translate(0, 0), rotate(-40 ${
                        // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
                        xScale(binIndex) + xBandwidth / 2
                      }, 0)`,
                    }
                  }
            }
            top={height - margin.bottom}
          />
          <AxisLeft
            label="Age"
            labelOffset={42}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
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
            {data
              .filter((d: any) => d.count !== 0)
              .map((d: any) => {
                return (
                  <React.Fragment key={`${d.xBinIndex}-${d.yBinIndex}`}>
                    <TooltipAnchor
                      // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: Element; }' is... Remove this comment to see the full error message
                      tooltip={
                        <>
                          {d.label}
                          <br /> {d.count.toLocaleString()} individual{d.count === 1 ? '' : 's'}
                        </>
                      }
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
              .filter((range: any) => range.start !== range.stop)
              .filter((range: any) => range.start <= maxRepeats)
              .map((range: any, rangeIndex: any) => {
                const startBinIndex = Math.floor(range.start / xBinSize)
                const startX =
                  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
                  xScale(startBinIndex) +
                  ((range.start - startBinIndex * xBinSize) / xBinSize) * xBandwidth

                let stopX
                if (range.stop <= maxRepeats) {
                  const stopBinIndex = Math.floor(range.stop / xBinSize)
                  stopX =
                    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
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
                    {range.start !== 0 &&
                      (rangeIndex === 0 || range.start > ranges[rangeIndex - 1].stop + 1) && (
                        <line
                          x1={startX}
                          y1={margin.top - 10}
                          x2={startX}
                          y2={margin.top + plotHeight}
                          stroke="#333"
                          strokeDasharray="3 3"
                        />
                      )}
                    {stopX !== plotWidth && (
                      <line
                        x1={stopX}
                        y1={margin.top - 10}
                        x2={stopX}
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
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatAgeDistributionPlot.displayName = 'ShortTandemRepeatAgeDistributionPlot'

ShortTandemRepeatAgeDistributionPlot.propTypes = {
  // @ts-expect-error TS(2322) FIXME: Type '{ ageDistribution: PropTypes.Requireable<(Pr... Remove this comment to see the full error message
  ageDistribution: PropTypes.arrayOf(
    PropTypes.shape({
      age_range: PropTypes.arrayOf(PropTypes.number).isRequired,
      distribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
    })
  ),
  maxRepeats: PropTypes.number.isRequired,
  ranges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
}

ShortTandemRepeatAgeDistributionPlot.defaultProps = {
  // @ts-expect-error TS(2322) FIXME: Type '{ ranges: never[]; }' is not assignable to t... Remove this comment to see the full error message
  ranges: [],
}

export default ShortTandemRepeatAgeDistributionPlot
