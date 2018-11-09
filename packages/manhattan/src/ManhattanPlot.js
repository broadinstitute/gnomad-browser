import React from 'react'
import PropTypes from 'prop-types'
import { scaleLinear } from 'd3-scale'
import { extent } from 'd3-array'

import { HUMAN_AUTOSOMES, HUMAN_CHROMOSOMES } from '@broad/utilities'

import { colorByChromosome } from './colorScales'

export const ManhattanPlot = ({
  data,
  height,
  includeSexChromosomes,
  onClickPoint,
  pointColor,
  title,
  width,
}) => {
  const padding = 60

  const plotChromosomes = includeSexChromosomes ? HUMAN_CHROMOSOMES : HUMAN_AUTOSOMES

  const chromPositionExtent = plotChromosomes.reduce(
    (acc, chr) => ({ ...acc, [chr]: { min: Infinity, max: -Infinity } }),
    {}
  )

  data.forEach((d) => {
    chromPositionExtent[d.chromosome].min = Math.min(chromPositionExtent[d.chromosome].min, d.pos)
    chromPositionExtent[d.chromosome].max = Math.max(chromPositionExtent[d.chromosome].max, d.pos)
  })

  const chromOffset = {}
  let cumulativePosition = 0
  plotChromosomes.forEach((chr) => {
    chromOffset[chr] = cumulativePosition
    cumulativePosition += chromPositionExtent[chr].max - chromPositionExtent[chr].min
  })

  const xScale = scaleLinear()
    .domain([0, cumulativePosition])
    .range([0 + padding, width])

  const yExtent = extent(data, d => d['-log10p'])
  const yScale = scaleLinear()
    .domain(yExtent)
    .range([height - padding, 10])
    .nice()

  const titleText = (
    <text
      className={'title'}
      x={width / 2}
      y={padding / 2}
    >
      {title}
    </text>
  )

  const yAxisLabel = (
    <text
      x={5}
      y={height / 2}
      transform={`rotate(270 ${padding / 3} ${height / 2})`}
    >
      {'-log10(P)'}
    </text>
  )

  const yAxisTicks = (
    <g>
      {yScale.ticks().map((t) => {
        return (
          <g key={t}>
            <line
              x1={padding}
              x2={width}
              y1={yScale(t)}
              y2={yScale(t)}
              stroke={'#BDBDBD'}
            />
            <text
              className={'yTickText'}
              textAnchor={'middle'}
              x={padding - 15}
              y={yScale(t) + 5}
            >
              {t}
            </text>
          </g>
        )
      })}
    </g>
  )

  const xAxisLabel = (
    <text
      className={'xLabel'}
      textAnchor={'middle'}
      x={width / 2}
      y={height - (padding / 4)}
    >
      Chromosome
    </text>
  )

  const xAxisTicks = (
    <g>
      {plotChromosomes.map(chr => (
        <text
          key={chr}
          className={'chromosomeLabel'}
          textAnchor={'middle'}
          x={xScale(
            chromOffset[chr] + ((chromPositionExtent[chr].max - chromPositionExtent[chr].min) / 2)
          )}
          y={(height - padding) + 20}
        >
          {chr}
        </text>
      ))}
    </g>
  )

  const clickHandler = e => onClickPoint(e.target.getAttribute('data-id'))

  const renderedPoints = data.map((dataPoint) => {
    return (
      <circle
        key={dataPoint.id}
        data-id={dataPoint.id}
        cx={xScale(chromOffset[dataPoint.chromosome] + dataPoint.pos)}
        cy={yScale(dataPoint['-log10p'])}
        r={2}
        fill={pointColor(dataPoint)}
        onClick={clickHandler}
      />
    )
  })

  return (
    <div>
      <svg width={width} height={height}>
        {titleText}
        {yAxisLabel}
        {yAxisTicks}
        {xAxisLabel}
        {xAxisTicks}
        {renderedPoints}
      </svg>
    </div>
  )
}

ManhattanPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    chromosome: PropTypes.oneOf(HUMAN_CHROMOSOMES).isRequired,
    pos: PropTypes.number.isRequired,
    '-log10p': PropTypes.number.isRequired,
  })).isRequired,
  height: PropTypes.number,
  includeSexChromosomes: PropTypes.bool,
  onClickPoint: PropTypes.func,
  pointColor: PropTypes.func,
  title: PropTypes.string,
  width: PropTypes.number,
}

ManhattanPlot.defaultProps = {
  height: 500,
  includeSexChromosomes: false,
  onClickPoint: () => {},
  pointColor: colorByChromosome(['rgb(139,53,40)', 'rgb(60,100,166)']),
  title: '',
  width: 900,
}
