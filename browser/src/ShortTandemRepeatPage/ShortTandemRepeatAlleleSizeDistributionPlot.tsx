import { max } from 'd3-array'
import { scaleBand, scaleLinear, scaleLog, scaleOrdinal } from 'd3-scale'
import React, { useMemo } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { BarStack, Bar } from '@visx/shape'
import { AnyD3Scale } from '@visx/scale'
import { LegendOrdinal } from '@visx/legend'

import { TooltipAnchor } from '@gnomad/ui'
import { GNOMAD_POPULATION_NAMES, PopulationId } from '@gnomad/dataset-metadata/gnomadPopulations'
import { colorByLabels } from './ShortTandemRepeatColorBySelect'

// The 100% width/height container is necessary the component
// to size to fit its container vs staying at its initial size.
const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%; /* stylelint-disable-line unit-whitelist */
`

const BarWithHoverEffect = styled(Bar)`
  pointer-events: visible;

  &:hover {
    fill-opacity: 0.7;
  }
`

export type ScaleType =
  | 'linear'
  | 'linear-truncated-50'
  | 'linear-truncated-200'
  | 'linear-truncated-1000'
  | 'log'

export const genotypeQualityKeys = [
  'low',
  'medium-low',
  'medium',
  'medium-high',
  'high',
  'not-reviewed',
] as const

export type GenotypeQuality = (typeof genotypeQualityKeys)[number]

export const qScoreKeys = [
  '0',
  '0.1',
  '0.2',
  '0.3',
  '0.4',
  '0.5',
  '0.6',
  '0.7',
  '0.8',
  '0.9',
  '1',
] as const

export type QScoreBin = (typeof qScoreKeys)[number]
export type ColorByValue = GenotypeQuality | QScoreBin | Sex | PopulationId | ''

export type AlleleSizeDistributionItem = {
  repunit_count: number
  frequency: number
  colorByValue: ColorByValue
}

export type Sex = 'XX' | 'XY'

export type ColorBy = 'quality_description' | 'q_score' | 'population' | 'sex'

const defaultColor = '#73ab3d'
const colorMap: Record<ColorBy | '', Record<string, string>> = {
  '': {
    '': defaultColor,
  },
  quality_description: {
    low: '#d73027',
    'medium-low': '#fc8d59',
    medium: '#fee08b',
    'medium-high': '#d9ef8b',
    high: '#1a9850',
    'not-reviewed': '#aaaaaa',
  },
  q_score: {
    '0': '#ff0000',
    '0.1': '#ff3300',
    '0.2': '#ff6600',
    '0.3': '#ff9900',
    '0.4': '#ffcc00',
    '0.5': '#ffff00',
    '0.6': '#ccff33',
    '0.7': '#99ff66',
    '0.8': '#66ff99',
    '0.9': '#33ffcc',
    '1': '#00ff00',
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
} as const

const qualityDescriptionLabels: Record<GenotypeQuality, string> = {
  low: 'Low',
  'medium-low': 'Medium-low',
  medium: 'Medium',
  'medium-high': 'Medium-high',
  high: 'High',
  'not-reviewed': 'Not reviewed',
}

const qScoreLabels: Record<QScoreBin, string> = {
  '0': '0 to 0.05',
  '0.1': '0.05 to 0.15',
  '0.2': '0.15 to 0.25',
  '0.3': '0.25 to 0.35',
  '0.4': '0.35 to 0.45',
  '0.5': '0.45 to 0.55',
  '0.6': '0.55 to 0.65',
  '0.7': '0.65 to 0.75',
  '0.8': '0.75 to 0.85',
  '0.9': '0.85 to 0.95',
  '1': '0.95 to 1',
}

const fixedLegendLabels: Partial<Record<ColorBy, Record<string, string>>> = {
  quality_description: qualityDescriptionLabels,
  q_score: qScoreLabels,
  population: GNOMAD_POPULATION_NAMES,
}

const legendLabel = (colorBy: ColorBy, key: string) => fixedLegendLabels[colorBy]?.[key] || key

const legendLabels = (colorBy: ColorBy, keys: string[]) =>
  keys.map((key) => legendLabel(colorBy, key))

const colorForValue = (colorBy: ColorBy | '', value: string) =>
  colorMap[colorBy]?.[value] || defaultColor
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

type Bin = Partial<Record<ColorByValue, number>> & {
  index: number
  label: string
  fullFrequency: number
}

const legendKeys: Record<ColorBy, string[]> = {
  quality_description: [...genotypeQualityKeys],
  q_score: [...qScoreKeys],
  sex: ['XX', 'XY'],
  population: ['nfe', 'afr', 'fin', 'amr', 'ami', 'asj', 'eas', 'mid', 'oth', 'sas'],
}

const LegendFromColorBy = ({ colorBy }: { colorBy: ColorBy | '' }) => {
  if (colorBy === '') {
    return null
  }

  const keys = legendKeys[colorBy]
  const labels = legendLabels(colorBy, [...keys])
  const colors = keys.map((key) => colorMap[colorBy][key])
  const scale = scaleOrdinal().domain(labels).range(colors)
  return (
    <LegendOrdinal
      scale={scale}
      shapeMargin="0 7px 20px 0px"
      labelMargin="0 10px 20px 0px"
      direction="row"
    />
  )
}

const tooltipContent = (data: Bin, colorBy: ColorBy | '', key: ColorByValue | ''): string => {
  const repeatText = data.label === '1' ? '1 repeat' : `${data.label} repeats`
  const alleles = data[key] || 0
  const alleleText = alleles === 1 ? '1 allele' : `${alleles} alleles`
  const colorByText =
    colorBy === '' ? '' : `, ${colorByLabels[colorBy]} is ${legendLabel(colorBy, key)}`
  return `${repeatText}${colorByText}: ${alleleText}`
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

    const binLabels: string[] = [...Array(nBins).keys()].map((binIndex) =>
      binSize === 1 ? `${binIndex}` : `${binIndex * binSize} - ${binIndex * binSize + binSize - 1}`
    )

    const emptyBins: Bin[] = Array.from(Array(nBins)).map((_, binIndex) => ({
      label: binLabels[binIndex],
      index: binIndex,
      fullFrequency: 0,
    }))

    const data: Bin[] = useMemo(() => {
      const binsByColorByValue = alleleSizeDistribution.reduce((acc, item) => {
        const binIndex = Math.floor(item.repunit_count / binSize)
        const oldBin: Bin = acc[binIndex]
        const oldFrequency = oldBin[item.colorByValue] || 0
        const newFrequency = oldFrequency + item.frequency
        const newBin: Bin = {
          ...oldBin,
          [item.colorByValue]: newFrequency,
          fullFrequency: oldBin.fullFrequency + item.frequency,
        }
        return { ...acc, [binIndex]: newBin }
      }, emptyBins)
      return Object.values(binsByColorByValue)
    }, [alleleSizeDistribution, binSize, emptyBins])

    const keys = useMemo(() => {
      const keySet: Record<string, boolean> = data
        .flatMap((bin) => Object.keys(bin))
        .reduce((acc, key) => ({ ...acc, [key]: true }), {})
      return Object.keys(keySet).filter(
        (key) => key !== 'index' && key !== 'label' && key !== 'fullFrequency'
      )
    }, [data])
    // maps binIndex and colorByValue to a y and y start

    const xScale = scaleBand<number>()
      .domain(data.map((d) => d.index))
      .range([0, plotWidth])

    const xBandwidth = xScale.bandwidth()

    let yScale: AnyD3Scale
    if (scaleType === 'log') {
      const maxLog = Math.ceil(Math.log10(max(data, (d) => d.fullFrequency) || 1))
      yScale = scaleLog()
        .domain([1, 10 ** maxLog])
        .range([plotHeight, 0])
        .clamp(true)
    } else if (scaleType === 'linear-truncated-50') {
      yScale = scaleLinear().domain([0, 50]).range([plotHeight, 0]).clamp(true)
    } else if (scaleType === 'linear-truncated-200') {
      yScale = scaleLinear().domain([0, 200]).range([plotHeight, 0]).clamp(true)
    } else if (scaleType === 'linear-truncated-1000') {
      yScale = scaleLinear().domain([0, 1000]).range([plotHeight, 0]).clamp(true)
    } else {
      yScale = scaleLinear()
        .domain([0, max(data, (d) => d.fullFrequency) || 1])
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
        <LegendFromColorBy colorBy={colorBy} />
        <svg height={binSize === 1 ? height - 20 : height} width={width}>
          <AxisBottom
            label="Repeats"
            labelOffset={binSize === 1 ? 10 : 30}
            labelProps={labelProps}
            left={margin.left}
            scale={xScale}
            stroke="#333"
            tickFormat={(binIndex: number) =>
              binIndex % labelInterval === 0 ? binLabels[binIndex] : ''
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
            <BarStack
              data={data}
              keys={keys}
              xScale={xScale}
              yScale={yScale}
              stroke="black"
              color={(key) => colorForValue(colorBy, key.toString())}
              x={(bin) => bin.index}
              y0={(point) => point[0] || 0}
              y1={(point) => point[1] || 0}
            >
              {(stacks) =>
                stacks.map((stack) =>
                  stack.bars.map((bar) => {
                    const tooltip = tooltipContent(
                      bar.bar.data,
                      colorBy,
                      bar.key as ColorByValue | ''
                    )
                    return (
                      <React.Fragment key={`bar-stack-${bar.x}-${bar.y}`}>
                        <TooltipAnchor
                          // @ts-expect-error
                          tooltip={tooltip}
                        >
                          <g>
                            <BarWithHoverEffect {...bar} stroke="black" fill={bar.color} />
                          </g>
                        </TooltipAnchor>
                      </React.Fragment>
                    )
                  })
                )
              }
            </BarStack>
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
