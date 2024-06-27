import React, { useEffect, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import styled from 'styled-components'
import { Track } from '@gnomad/region-viewer'
import queryString from 'query-string'

const RecombinationPlotWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
`

type RecombinationRate = {
  start: number
  end: number
  value: number
}

type RecombinationRatePlotProps = {
  chrom: string
  start: number
  stop: number
}

const RecombinationRatePlot = ({ chrom, start, stop }: RecombinationRatePlotProps) => {
  const [recombinationRates, setRecombinationRates] = useState<RecombinationRate[]>([])

  useEffect(() => {
    const fetchRecombinationData = async () => {
      try {
        const response = await fetch(
          `http://localhost:8123/recombination?chrom=${chrom}&start=${start}&stop=${stop}`
        )
        const data = await response.json()
        setRecombinationRates(data)
      } catch (error) {
        console.error('Error fetching recombination data:', error)
      }
    }

    fetchRecombinationData()
  }, [chrom, start, stop])

  const rateScale = scaleLinear()
    .domain([0, Math.max(...recombinationRates.map((d) => d.value))])
    .range([0, 50]) // Change 50 to the desired max height in pixels

  return (
    <Track
      renderLeftPanel={() => (
        <svg width={100} height={120}>
          <text x={15} y={50} fontSize='12' textAnchor='middle' transform='rotate(-90, 15, 50)'>
            Recombination
            <tspan x={15} dy='1.2em'>
              Rate (cM/Mb)
            </tspan>
          </text>
          <line x1={45} y1={15} x2={45} y2={85} stroke='black' />
          {[0, 0.5, 1].map((tick) => (
            <g key={tick} transform={`translate(40, ${15 + (1 - tick) * 70})`}>
              <line x1={5} y1={0} x2={15} y2={0} stroke='black' />
              <text x={25} y={3} fontSize='10' textAnchor='start'>
                {tick}
              </text>
            </g>
          ))}
        </svg>
      )}
    >
      {({ scalePosition, width }: { scalePosition: (input: number) => number; width: number }) => (
        <RecombinationPlotWrapper>
          <svg width={width} height={60}>
            <path
              d={recombinationRates
                .map((d, index) => {
                  const x = scalePosition(d.start)
                  const y = 60 - rateScale(d.value)
                  return `${index === 0 ? 'M' : 'L'}${x},${y}`
                })
                .join(' ')}
              fill='none'
              stroke='#4682b4'
              strokeWidth='2'
            />
          </svg>
        </RecombinationPlotWrapper>
      )}
    </Track>
  )
}

export default RecombinationRatePlot
