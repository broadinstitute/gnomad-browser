import { max } from 'd3-array'
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

const tickFormat = (n: any) => {
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

const ShortTandemRepeatAlleleSizeDistributionPlot = withSize()(
  ({
    // @ts-expect-error TS(2339) FIXME: Property 'maxRepeats' does not exist on type '{}'.
    maxRepeats,
    // @ts-expect-error TS(2339) FIXME: Property 'alleleSizeDistribution' does not exist o... Remove this comment to see the full error message
    alleleSizeDistribution,
    // @ts-expect-error TS(2339) FIXME: Property 'repeatUnitLength' does not exist on type... Remove this comment to see the full error message
    repeatUnitLength,
    // @ts-expect-error TS(2339) FIXME: Property 'size' does not exist on type '{}'.
    size: { width },
    // @ts-expect-error TS(2339) FIXME: Property 'scaleType' does not exist on type '{}'.
    scaleType,
    // @ts-expect-error TS(2339) FIXME: Property 'ranges' does not exist on type '{}'.
    ranges,
  }) => {
    const height = 300

    const margin = {
      bottom: 65,
      left: 60,
      right: 10,
      top: 20,
    }

    const plotWidth = width - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const binSize = Math.max(1, Math.ceil(maxRepeats / (plotWidth / 10)))
    const nBins = Math.floor(maxRepeats / binSize) + 1

    const data = useMemo(() => {
      const d = Array.from(Array(nBins).keys()).map((n: any) => ({
        binIndex: n,
        label: binSize === 1 ? `${n}` : `${n * binSize} - ${n * binSize + binSize - 1}`,
        count: 0,
      }))

      // @ts-expect-error TS(7031) FIXME: Binding element 'repeatCount' implicitly has an 'a... Remove this comment to see the full error message
      alleleSizeDistribution.forEach(([repeatCount, nAlleles]) => {
        const binIndex = Math.floor(repeatCount / binSize)
        d[binIndex].count += nAlleles
      })

      return d
    }, [alleleSizeDistribution, nBins, binSize])

    const xScale = scaleBand()
      .domain(data.map((d: any) => d.binIndex))
      .range([0, plotWidth])

    const xBandwidth = xScale.bandwidth()

    let yScale: any
    if (scaleType === 'log') {
      const maxLog = Math.ceil(Math.log10(max(data, (d: any) => d.count) || 1))
      yScale = scaleLog()
        .domain([1, 10 ** maxLog])
        .range([plotHeight - 10, 0])
    } else {
      yScale = scaleLinear()
        .domain([0, max(data, (d: any) => d.count) || 1])
        .range([plotHeight, 0])
    }

    const maxNumLabels = Math.floor(plotWidth / 20)

    const labelInterval = Math.max(Math.round(nBins / maxNumLabels), 1)

    let readLengthX
    if (repeatUnitLength !== null) {
      const readLengthInRepeats = 150 / repeatUnitLength
      if (readLengthInRepeats <= maxRepeats) {
        const readLengthBinIndex = Math.floor(readLengthInRepeats / binSize)
        // Read length line should be drawn at the center of the range for its value.
        readLengthX =
          // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
          xScale(readLengthBinIndex) +
          ((readLengthInRepeats - readLengthBinIndex * binSize) / binSize) * xBandwidth +
          xBandwidth / binSize / 2
      }
    }

    return (
      <GraphWrapper>
        <svg height={binSize === 1 ? height - 20 : height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={binSize === 1 ? 10 : 30}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={(binIndex) =>
              // @ts-expect-error TS(7015) FIXME: Element implicitly has an 'any' type because index... Remove this comment to see the full error message
              (binIndex as any) % labelInterval === 0 ? data[binIndex].label : ''
            }
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
            label="Alleles"
            labelOffset={40}
            // @ts-expect-error TS(2322) FIXME: Type '{ fontSize: number; textAnchor: string; }' i... Remove this comment to see the full error message
            labelProps={labelProps}
            left={margin.left}
            numTicks={scaleType === 'log' ? 10 : Math.min(10, yScale.domain()[1])}
            scale={yScale}
            stroke="#333"
            tickFormat={
              scaleType === 'log'
                ? // @ts-expect-error TS(2345) FIXME: Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
                  (n) => (Number.isInteger(Math.log10(n)) ? tickFormat(n) : '')
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
            {data.map((d: any) => {
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
                    // @ts-expect-error TS(2322) FIXME: Type '{ children: Element; tooltip: string; }' is ... Remove this comment to see the full error message
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
            {ranges
              .filter((range: any) => range.start !== range.stop)
              .filter((range: any) => range.start <= maxRepeats)
              .map((range: any, rangeIndex: any) => {
                const startBinIndex = Math.floor(range.start / binSize)
                const startX =
                  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
                  xScale(startBinIndex) +
                  ((range.start - startBinIndex * binSize) / binSize) * xBandwidth
                let stopX
                if (range.stop <= maxRepeats) {
                  const stopBinIndex = Math.floor(range.stop / binSize)
                  stopX =
                    // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
                    xScale(stopBinIndex) +
                    ((range.stop - stopBinIndex * binSize) / binSize) * xBandwidth
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

            {readLengthX && (
              <>
                <line
                  x1={readLengthX}
                  y1={margin.top}
                  x2={readLengthX}
                  y2={margin.top + plotHeight}
                  stroke="#333"
                  strokeDasharray="1 5"
                />
                <text
                  x={readLengthX}
                  y={margin.top}
                  dy="-0.5em"
                  fontSize={10}
                  textAnchor="end"
                  transform={`rotate(-90 ${readLengthX}, ${margin.top})`}
                  pointerEvents="none"
                >
                  Read length (150 bp)
                </text>
              </>
            )}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

ShortTandemRepeatAlleleSizeDistributionPlot.displayName =
  'ShortTandemRepeatAlleleSizeDistributionPlot'

ShortTandemRepeatAlleleSizeDistributionPlot.propTypes = {
  // @ts-expect-error TS(2322) FIXME: Type '{ maxRepeats: PropTypes.Validator<number>; a... Remove this comment to see the full error message
  maxRepeats: PropTypes.number.isRequired,
  alleleSizeDistribution: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  repeatUnitLength: PropTypes.number,
  scaleType: PropTypes.oneOf(['linear', 'log']),
  ranges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
}

ShortTandemRepeatAlleleSizeDistributionPlot.defaultProps = {
  // @ts-expect-error TS(2322) FIXME: Type '{ scaleType: string; ranges: never[]; }' is ... Remove this comment to see the full error message
  scaleType: 'linear',
  ranges: [],
}

export default ShortTandemRepeatAlleleSizeDistributionPlot
