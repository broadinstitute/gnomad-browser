import React, { PropTypes } from 'react'
import R from 'ramda'
import { scaleLinear, scaleBand } from 'd3-scale'
import { max, min, range } from 'd3-array'

import {
  HUMAN_CHROMOSOMES,
  HUMAN_AUTOSOMES,
} from 'lens-utilities/lib/constants'

import css from './styles.css'

const ManhattanPlot = ({
  data,
  title = '',
  sexChromosomes = false,
  showAxisBounds = false,
}) => {
  const width = 1300
  const height = 500
  const padding = 60
  const yData = R.pluck('-log10p', data)

  const plotChromosomes = sexChromosomes ? HUMAN_CHROMOSOMES : HUMAN_AUTOSOMES
  const rgb = () => Math.floor(Math.random() * 256)
  const colorCode = () => `rgb(${rgb()}, ${rgb()}, ${rgb()})`
  const chromosomeColors = plotChromosomes.reduce((acc, chr) =>
    ({ ...acc, [chr]: colorCode()}), {})

  const xScale = scaleLinear()
    .domain([0, data.length])
    .range([0 + padding, width])

  const yScale = scaleLinear()
    .domain([min(yData), max(yData) + (max(yData) * 0.1)])
    .range([height - padding, padding])

  const Background = () => (
    <rect
      className={css.background}
      x={0}
      y={0}
      width={width}
      height={height}
      fill={'none'}
      stroke={'black'}
    />
  )

  const AxisBackgroundY = () => (
    <rect
      className={css.axisBackground}
      x={0}
      y={0}
      width={padding}
      height={height}
      fill={'white'}
      stroke={'black'}
    />
  )

  const AxisBackgroundX = () => (
    <rect
      className={css.axisBackground}
      x={0}
      y={height - padding}
      width={width}
      height={height}
      fill={'none'}
      stroke={'black'}
    />
  )

  const Title = () => (
    <text
      className={css.title}
      x={width / 2}
      y={padding / 2}
    >

    </text>
  )

  const Ylabel = () => (
    <text
      className={css.yLabel}
      x={5}
      y={height / 2}
      transform={`rotate(270 ${padding / 3} ${height / 2})`}
    >
      {'-log10(P)'}
    </text>
  )

  const Yticks = () => {
    return (
      <g>
        {yScale.ticks().map(t => {
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
                className={css.yTickText}
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
  }

  const Xlabel = () => (
    <text
      className={css.xLabel}
      x={width / 2}
      y={height - (padding / 4)}
    >
      Chromosome
    </text>
  )

  const Xticks = () => {
    const snpsSplitByChrom = plotChromosomes.map((chr, i) =>
      ({
        name: chr,
        data: data.filter(snp => chr === `chr${snp.chromosome}`),
      })
    )
    const chrWithPos = snpsSplitByChrom.reduce((acc, chr, i) => {
      const count = chr.data.length
      if (i === 0) return [ { name: chr.name, pos: xScale(count - (count / 2)), count } ]
      const previousCount = acc[i - 1].count
      const currentCount = previousCount + count
      const pos = xScale(currentCount - (count / 2))
      return [...acc, { name: chr.name, pos, count: currentCount }]
    }, [])
    return (
      <g>
        {chrWithPos.map(chr => (
          <text
            key={chr.name}
            className={css.chromosomeLabel}
            x={chr.pos}
            y={height - padding + 20}
          >
            {chr.name.replace('chr', '')}
          </text>
        ))}
      </g>
    )
  }

  const snps = data.map((snp, i) => {
    const color = chromosomeColors[`chr${snp.chromosome}`]
    return (
      <circle
        key={`snp-${i}`}
        className={css.snp}
        cx={xScale(i)}
        cy={yScale(snp['-log10p'])}
        r={2}
        fill={color}
        stroke={'black'}
      />
    )
  })

  return (
    <div className={css.component}>
      <svg width={width} height={height}>
        {showAxisBounds &&
          <Background /> &&
          <AxisBackgroundY /> &&
          <AxisBackgroundX />
        }
        <Title />
        <Ylabel />
        <Yticks />
        <Xlabel />
        <Xticks />
        {snps}
      </svg>
    </div>
  )
}
ManhattanPlot.propTypes = {
  data: PropTypes.array.isRequired,
}
export default ManhattanPlot
