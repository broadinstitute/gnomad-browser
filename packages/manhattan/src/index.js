import React from 'react'
import PropTypes from 'prop-types'
import R from 'ramda'
import { scaleLinear } from 'd3-scale'
import { max, min } from 'd3-array'

import {
  HUMAN_CHROMOSOMES,
  HUMAN_AUTOSOMES,
} from '@broad/utilities/src/constants'


function randomColor() {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgb(${r},${g},${b})`
}


const ManhattanPlot = ({
  data,
  title,
  width,
  height,
  includeSexChromosomes,
  showAxisBounds,
}) => {
  const padding = 60
  const yData = R.pluck('-log10p', data)

  const plotChromosomes = includeSexChromosomes ? HUMAN_CHROMOSOMES : HUMAN_AUTOSOMES
  const chromosomeColors = plotChromosomes.reduce((acc, chr) =>
    ({ ...acc, [chr.replace('chr', '')]: randomColor() }), {})

  const xScale = scaleLinear()
    .domain([0, data.length])
    .range([0 + padding, width])

  const yScale = scaleLinear()
    .domain([min(yData), max(yData) + (max(yData) * 0.1)])
    .range([height - padding, 10])

  const background = (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={'none'}
      stroke={'black'}
    />
  )

  const yAxisBackground = (
    <rect
      x={0}
      y={0}
      width={padding}
      height={height}
      fill={'white'}
      stroke={'black'}
    />
  )

  const xAxisBackground = (
    <rect
      x={0}
      y={height - padding}
      width={width}
      height={height}
      fill={'none'}
      stroke={'black'}
    />
  )

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

  const snpsSplitByChrom = plotChromosomes.map(chr =>
    ({
      name: chr,
      data: data.filter(snp => chr === `chr${snp.chromosome}`),
    })
  )
  const chrWithPos = snpsSplitByChrom.reduce((acc, chr, i) => {
    const count = chr.data.length
    if (i === 0) return [{ name: chr.name, pos: xScale(count - (count / 2)), count }]
    const previousCount = acc[i - 1].count
    const currentCount = previousCount + count
    const pos = xScale(currentCount - (count / 2))
    return [...acc, { name: chr.name, pos, count: currentCount }]
  }, [])

  const xAxisTicks = (
    <g>
      {chrWithPos.map(chr => (
        <text
          key={chr.name}
          className={'chromosomeLabel'}
          textAnchor={'middle'}
          x={chr.pos}
          y={height - (padding + 20)}
        >
          {chr.name.replace('chr', '')}
        </text>
      ))}
    </g>
  )

  const snps = data.map((snp, i) => {
    const color = chromosomeColors[snp.chromosome]
    return (
      <circle
        key={snp.snp}
        cx={xScale(i)}
        cy={yScale(snp['-log10p'])}
        r={2}
        fill={color}
        stroke={'black'}
      />
    )
  })

  return (
    <div>
      <svg width={width} height={height}>
        {showAxisBounds && (
          <g>
            {background}
            {yAxisBackground}
            {xAxisBackground}
          </g>
        )}
        {titleText}
        {yAxisLabel}
        {yAxisTicks}
        {xAxisLabel}
        {xAxisTicks}
        {snps}
      </svg>
    </div>
  )
}

ManhattanPlot.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    snp: PropTypes.string.isRequired,
    chromosome: PropTypes.oneOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 'X', 'Y']).isRequired,
    pos: PropTypes.number.isRequired,
    '-log10p': PropTypes.number.isRequired,
  })).isRequired,
  height: PropTypes.number,
  includeSexChromosomes: PropTypes.bool,
  showAxisBounds: PropTypes.bool,
  title: PropTypes.string,
  width: PropTypes.number,
}

ManhattanPlot.defaultProps = {
  height: 500,
  includeSexChromosomes: false,
  showAxisBounds: false,
  title: '',
  width: 900,
}

export default ManhattanPlot
