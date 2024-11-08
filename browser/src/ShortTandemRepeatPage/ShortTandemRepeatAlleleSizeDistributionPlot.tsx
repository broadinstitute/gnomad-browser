import { max } from 'd3-array'
import { scaleBand, scaleLinear, scaleLog } from 'd3-scale'
import React, { useMemo } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@visx/axis'

import { TooltipAnchor } from '@gnomad/ui'
import {
  AlleleSizeDistributionItem,
  ColorBy,
  GenotypeQuality,
  QScoreBin,
  ScaleType,
  Sex,
} from './ShortTandemRepeatPage'
import { PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'

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

const colorMap: Record<string, Record<string, string>> = {
  '': {
    '': '#73ab3d',
  },
  quality_description: {
    low: '#d73027',
    'low-medium': '#fc8d59',
    medium: '#fee08b',
    'medium-high': '#d9ef8b',
    high: '#1a9850',
    'not-reviewed': '#aaaaaa',
  },
  q_score: {
    '0.0': '#ff0000',
    '0.1': '#ff3300',
    '0.2': '#ff6600',
    '0.3': '#ff9900',
    '0.4': '#ffcc00',
    '0.5': '#ffff00',
    '0.6': '#ccff33',
    '0.7': '#99ff66',
    '0.8': '#66ff99',
    '0.9': '#33ffcc',
    '1.0': '#00ff00',
  },
  sex: {
    XX: '#F7C3CC',
    XY: '#6AA6CE',
  },
  population: {
    nfe: '#6AA6CE',
    afr: '#941494',
    fin: '#012F6C',
    amr: '#EF1E24',
    ami: '#ff7f00',
    asj: '#FF7E4F',
    eas: '#128B44',
    mid: '#f781bf',
    oth: '#ABB8B9',
    sas: '#FE9A10',
  },
}

const tickFormat = (n: number) => {
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
} as const

type Range = { start: number; stop: number; label: string }

type Props = {
  maxRepeats: number
  alleleSizeDistribution: AlleleSizeDistributionItem[]
  colorBy: ColorBy | ''
  repeatUnitLength: number | null
  scaleType: ScaleType
  ranges?: Range[]
  size: { width: number }
}

const ShortTandemRepeatAlleleSizeDistributionPlot = withSize()(
  ({
    maxRepeats,
    alleleSizeDistribution,
    colorBy,
    repeatUnitLength,
    size: { width },
    scaleType = 'linear',
    ranges = [],
  }: Props) => {
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
      const d = Array.from(Array(nBins).keys()).map((n) => ({
        binIndex: n,
        label: binSize === 1 ? `${n}` : `${n * binSize} - ${n * binSize + binSize - 1}`,
        count: 0,
      }))

      alleleSizeDistribution.forEach(({ repunit_count, frequency }) => {
        const binIndex = Math.floor(repunit_count / binSize)
        d[binIndex].count += frequency
      })

      return d
    }, [alleleSizeDistribution, nBins, binSize])

    // maps binIndex and colorByValue to a y and y start
    const dataWithColor = useMemo(() => {
      //sort by ColorBy value
      alleleSizeDistribution.sort((a, b) => {
        if (a.colorByValue < b.colorByValue) {
          return 1
        }
        if (a.colorByValue > b.colorByValue) {
          return -1
        }
        return 0
      })

      const d: Record<
        string,
        { binIndex: number; label: string; count: number; startCount: number; color: string }
      > = {}

      alleleSizeDistribution.forEach(({ repunit_count, colorByValue, frequency }) => {
        const n = Math.floor(repunit_count / binSize)
        const key = `${n}/${colorByValue}`
        const labelPrefix = colorByValue ? `${colorByValue}: ` : ''
        if (!d[key]) {
          d[key] = {
            binIndex: n,
            label:
              binSize === 1
                ? `${labelPrefix} ${n}`
                : `${labelPrefix} ${n * binSize} - ${n * binSize + binSize - 1}`,
            count: 0,
            startCount: 0,
            color: colorMap[colorBy] ? colorMap[colorBy][colorByValue] : '#73ab3d',
          }
        }

        d[key].count += frequency
      })

      return Object.values(d)
    }, [alleleSizeDistribution, nBins, binSize])

    const binCountCache = Array(nBins).fill(0)
    dataWithColor.forEach((d) => {
      d.startCount = binCountCache[d.binIndex]
      binCountCache[d.binIndex] += d.count
    })

    const xScale = scaleBand<number>()
      .domain(data.map((d) => d.binIndex))
      .range([0, plotWidth])

    const xBandwidth = xScale.bandwidth()

    let yScale: any
    if (scaleType === 'log') {
      const maxLog = Math.ceil(Math.log10(max(data, (d) => d.count) || 1))
      yScale = scaleLog()
        .domain([1, 10 ** maxLog])
        .range([plotHeight, 0])
    } else if (scaleType === 'linear-truncated') {
      yScale = scaleLinear().domain([0, 50]).range([plotHeight, 0])
    } else {
      yScale = scaleLinear()
        .domain([0, max(data, (d) => d.count) || 1])
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
          (xScale(readLengthBinIndex) || 0) +
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
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={(binIndex: number) =>
              binIndex % labelInterval === 0 ? data[binIndex].label : ''
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
                        (xScale(binIndex) || 0) + xBandwidth / 2
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
            numTicks={scaleType === 'log' ? 10 : Math.min(10, yScale.domain()[1])}
            scale={yScale}
            stroke="#333"
            tickFormat={
              scaleType === 'log'
                ? (n: unknown) =>
                    Number.isInteger(Math.log10(n as number)) ? tickFormat(n as number) : ''
                : (n: unknown) => tickFormat(n as number)
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
            {dataWithColor.map((d) => {
              const y = d.count === 0 ? 0 : yScale(d.count)
              const yStart = d.startCount === 0 ? 0 : plotHeight - yScale(d.startCount)
              return (
                <React.Fragment key={`${d.binIndex}-${d.color}`}>
                  <rect
                    x={xScale(d.binIndex)}
                    y={y - yStart}
                    height={plotHeight - y}
                    width={xBandwidth}
                    fill={d.color}
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
                      y={y - yStart}
                      height={plotHeight - y}
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
              .filter((range) => range.start !== range.stop)
              .filter((range) => range.start <= maxRepeats)
              .map((range, rangeIndex) => {
                const startBinIndex = Math.floor(range.start / binSize)
                const startX =
                  (xScale(startBinIndex) || 0) +
                  ((range.start - startBinIndex * binSize) / binSize) * xBandwidth
                let stopX
                if (range.stop <= maxRepeats) {
                  const stopBinIndex = Math.floor(range.stop / binSize)
                  stopX =
                    (xScale(stopBinIndex) || 0) +
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

export default ShortTandemRepeatAlleleSizeDistributionPlot
