import React, { useRef } from 'react'
import styled from 'styled-components'
import { scaleLinear } from 'd3-scale'
import { LegendWrapper, LegendItem, LegendSwatch, LegendProps } from './CoverageTrack'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { Track } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'
import { AxisLeft } from '@vx/axis'

const TopPanel = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  width: 100%;
`
const TitlePanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding-right: 40px;
`
type PercentCallableValues = {
  pos: number
  percent_callable: number
  xpos: number
}

type GroupedData = {
  startPos: number
  endPos: number
  percent_callable: number
}

const Legend = ({ datasets }: LegendProps) => (
  <LegendWrapper>
    {datasets.map((dataset) => (
      <LegendItem key={dataset.name}>
        {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
        <LegendSwatch color={dataset.color} opacity={dataset.opacity} />
        {dataset.name}
      </LegendItem>
    ))}
  </LegendWrapper>
)

const groupDiscreteData = (buckets: PercentCallableValues[]): GroupedData[] => {
  const groupedData: GroupedData[] = []

  buckets.forEach((entry) => {
    const prevEntry = groupedData.length > 0 ? groupedData[groupedData.length - 1] : null

    if (prevEntry && prevEntry.percent_callable === entry.percent_callable) {
      prevEntry.endPos = entry.pos + 1
    } else {
      groupedData.push({
        startPos: entry.pos,
        endPos: entry.pos,
        percent_callable: entry.percent_callable,
      })
    }
  })
  return groupedData
}

const margin = {
  top: 7,
  left: 60,
}

const DiscreteBarPlot = ({
  datasets,
  height,
  regionStart,
  regionStop,
  chrom,
}: {
  datasets: { color: string; buckets: PercentCallableValues[]; name: string; opacity: number }[]
  height: number
  regionStart: number
  regionStop: number
  chrom: number
}) => {
  const groupedData = groupDiscreteData(datasets[0].buckets)

  const plotHeight = height + margin.top
  const yScale = scaleLinear().domain([0, 1]).range([plotHeight, margin.top])

  const plotRef = useRef(null)

  const exportPlot = () => {
    if (plotRef.current) {
      const serializer = new XMLSerializer()
      const data = serializer.serializeToString(plotRef.current)
      const blob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', data], {
        type: 'image/svg+xml;charset=utf-8',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${chrom}-${regionStart}-${regionStop}_percent_callable.svg`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)
    }
  }

  return (
    <Track
      groupedData={groupedData}
      renderLeftPanel={() => <TitlePanel> Percent Callable </TitlePanel>}
      renderTopPanel={() => (
        <TopPanel>
          <Legend datasets={datasets} />
          <Button style={{ marginLeft: '1em' }} onClick={exportPlot}>
            Save plot
          </Button>
        </TopPanel>
      )}
    >
      {({ width }: { width: number }) => {
        const plotWidth = width - margin.left

        const xDomain = [regionStart - 75, regionStop + 75]

        const xScale = scaleLinear().domain(xDomain).range([0, plotWidth])
        return (
          <div style={{ marginLeft: -margin.left }}>
            <svg ref={plotRef} width={width + margin.left} height={plotHeight}>
              <AxisLeft
                hideZero
                left={margin.left}
                tickLabelProps={() => ({
                  dx: '-0.25em',
                  dy: '0.25em',
                  fill: '#000',
                  fontSize: 10,
                  textAnchor: 'end',
                })}
                scale={yScale}
                stroke="#333"
              />
              <g transform={`translate(${margin.left},0)`}>
                {/* eslint-disable react/no-array-index-key */}
                {groupedData.map((entry: GroupedData, index: number) => {
                  return (
                    <rect
                      key={index}
                      x={xScale(entry.startPos)}
                      y={(1 - entry.percent_callable) * height + margin.top}
                      width={xScale(entry.endPos - entry.startPos + regionStart)}
                      height={entry.percent_callable * height}
                      fill="rgb(70, 130, 180)"
                      opacity={datasets[0].opacity}
                    />
                  )
                })}
                <line x1={0} y1={plotHeight} x2={width} y2={plotHeight} stroke="#333" />
              </g>
            </svg>
          </div>
        )
      }}
    </Track>
  )
}
export default DiscreteBarPlot
