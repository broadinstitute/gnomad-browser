import { NumberValue, scaleBand, scaleLinear } from 'd3-scale'
import React, { ReactNode } from 'react'
import { withSize } from 'react-sizeme'
import styled from 'styled-components'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { TooltipAnchor } from '@gnomad/ui'

import Legend from '../Legend'

import { DownloadElementAsPNGButton } from './DownloadFigure'

const GraphWrapper = styled.div`
  overflow: hidden;
  width: 100%;
  height: 100%;
  margin-bottom: 1em;
`

const TwoColumns = styled.div`
  display: flex;
  justify-content: space-around;

  @media (max-width: 992px) {
    display: block;
  }
`

const GraphSide = styled.div`
  width: 75%;

  @media (max-width: 992px) {
    width: 100%;
  }
`
const LegendSide = styled.div`
  width: 25%;

  @media (max-width: 992px) {
    width: 100%;
  }
`

const LegendWrapper = styled.div`
  margin-top: 3em;

  @media (max-width: 992px) {
    margin-top: 0;
  }
`

const BinHoverTarget = styled.rect`
  pointer-events: visible;
  fill: none;

  &:hover {
    fill: rgba(0, 0, 0, 0.05);
  }
`

const TitleRow = styled.div`
  display: flex;
  justify-content: space-between;
`

const Title = styled.span`
  width: 70%;
  margin: 14px auto 14px auto;
  font-weight: bold;

  /* non-zero letter spacing fixes html2canvas rendering errors */
  letter-spacing: 0.01px;
  text-align: center;
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
  bottom: 30,
  left: 60,
  right: 10,
  top: 10,
  legend: 50,
  bar: 25,
}

const labelProps = {
  fontSize: 14,
  textAnchor: 'middle',
}

const getDataCategories: (dataRow: DataRow) => string[] = (dataRow) => {
  const dataCategories = Object.keys(dataRow)
  dataCategories.splice(dataCategories.indexOf('label'), 1)

  return dataCategories
}

const getMaxRowSum = (dataRows: { [x: string]: number }[], dataCategories: string[]) => {
  let maxY = 0
  dataRows.forEach((row: { [x: string]: number }) => {
    let rowSum = 0
    dataCategories.forEach((category: string) => {
      rowSum += row[category]
    })
    if (rowSum > maxY) {
      maxY = rowSum
    }
  })

  return maxY
}

type DataRow = {
  label: string
  [x: string]: number | string
}

const StackedBarGraph = withSize()(
  ({
    barColors,
    barValues,
    formatTooltip,
    size: { width },
    height,
    xLabel,
    yLabel,
    displayNumbers,
  }: {
    barColors: { [x: string]: string }
    barValues: DataRow[]
    formatTooltip: (row: DataRow) => string | ReactNode
    size: { width: number }
    height: number
    xLabel: string
    yLabel: string
    displayNumbers: boolean
  }) => {
    const dataCategories = getDataCategories(barValues[0])

    const maxY = getMaxRowSum(barValues as { [x: string]: number }[], dataCategories)
    const yDomain = [0, maxY]

    const plotWidth = width - margin.legend - (margin.left + margin.right)
    const plotHeight = height - (margin.top + margin.bottom)

    const xBandScale = scaleBand()
      .domain(barValues.map((row: { label: string }) => row.label))
      .range([0, plotWidth])

    const barMargin = plotWidth / 25

    const bandWidth = xBandScale.bandwidth() - barMargin * 2

    const yScale = scaleLinear().domain(yDomain).range([plotHeight, 0])

    return (
      <GraphWrapper>
        <svg height={height} width={width - margin.legend}>
          <AxisBottom
            label={xLabel}
            labelOffset={30}
            // @ts-expect-error
            labelProps={labelProps}
            left={margin.left}
            top={margin.top + plotHeight}
            scale={xBandScale}
            stroke="#333"
            tickLabelProps={() => ({
              dx: '-0.25em',
              dy: '0.25em',
              fill: '#000',
              fontSize: 12,
              textAnchor: 'middle',
            })}
            tickLength={3}
          />
          <AxisLeft
            label={yLabel}
            // @ts-expect-error
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
          {dataCategories}
          <g transform={`translate(${margin.left},${margin.top})`}>
            {barValues.map((row: DataRow) => {
              let offset = 0
              return dataCategories.map((category: string) => {
                const barHeight = plotHeight - yScale(row[category] as NumberValue)
                const barSection = (
                  <React.Fragment key={`${row.label}-${category}`}>
                    <rect
                      // @ts-expect-error
                      x={xBandScale(row.label) + barMargin}
                      y={yScale(row[category] as NumberValue) - offset}
                      height={barHeight}
                      width={bandWidth}
                      fill={barColors[category]}
                      stroke="#333"
                    />
                    {displayNumbers && row[category] !== 0 && true && barHeight > 15 && (
                      <text
                        // @ts-expect-error
                        x={xBandScale(row.label) + bandWidth / 2 + barMargin}
                        y={yScale(row[category] as NumberValue) - offset + barHeight / 2}
                        fontSize={12}
                        dy={4}
                        textAnchor="middle"
                        fill="white"
                      >
                        {row[category].toLocaleString()}
                      </text>
                    )}

                    {/* @ts-expect-error */}
                    <TooltipAnchor tooltip={formatTooltip(row)}>
                      <BinHoverTarget
                        // @ts-expect-error
                        x={xBandScale(row.label) + barMargin}
                        y={0}
                        height={plotHeight}
                        width={bandWidth}
                      />
                    </TooltipAnchor>
                  </React.Fragment>
                )
                offset += barHeight
                return barSection
              })
            })}
          </g>
        </svg>
      </GraphWrapper>
    )
  }
)

const StackedBarGraphWithLegend = ({
  title,
  barColors,
  barValues,
  formatTooltip,
  height,
  xLabel,
  yLabel,
  displayNumbers,
}: {
  title: string
  barColors: { [x: string]: string }
  barValues: DataRow[]
  formatTooltip: (row: DataRow) => string | ReactNode
  height: number
  xLabel: string
  yLabel: string
  displayNumbers: boolean
}) => {
  const sluggedTitle = title
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .concat('test')

  const dataCategories = getDataCategories(barValues[0])

  const seriesLegend: { label: string; color: string }[] = []
  dataCategories.forEach((category: string) => {
    seriesLegend.unshift({
      label: category,
      color: barColors[category],
    })
  })

  return (
    <div id={sluggedTitle}>
      <TitleRow>
        <Title>
          {title}
          <DownloadElementAsPNGButton elementId={sluggedTitle} />
        </Title>
      </TitleRow>
      <TwoColumns>
        <GraphSide>
          <StackedBarGraph
            barColors={barColors}
            barValues={barValues}
            formatTooltip={formatTooltip}
            height={height}
            xLabel={xLabel}
            yLabel={yLabel}
            displayNumbers={displayNumbers}
          />
        </GraphSide>
        <LegendSide>
          <LegendWrapper>
            <Legend series={seriesLegend} />
          </LegendWrapper>
        </LegendSide>
      </TwoColumns>
    </div>
  )
}

export default StackedBarGraphWithLegend
