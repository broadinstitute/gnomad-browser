import React, { PropTypes } from 'react'
import R from 'ramda'
import { scaleLinear, scaleBand } from 'd3-scale'
import { max, range } from 'd3-array'

import css from './styles.css'

const ManhattanPlot = ({ data }) => {
  const width = 800
  const height = 500
  const padding = 75

  const yData = R.pluck('-log10p', data)

  const xScale = scaleLinear()
    .domain([0, data.length])
    .range([0 + padding, width])

  const yScale = scaleLinear()
    .domain([0, max(yData)])
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
      Manhattan plot
    </text>
  )

  const snps = data.map((snp, i) => {
    return (
      <circle
        key={`snp-${i}`}
        className={css.snp}
        cx={xScale(i)}
        cy={yScale(snp['-log10p'])}
        r={2}
        fill={'white'}
        stroke={'black'}
      />
    )
  })

  console.log(snps)

  return (
    <div className={css.component}>
      <svg width={width} height={height}>
        <Background />
        <AxisBackgroundY />
        <AxisBackgroundX />
        <Title />
        {snps}
      </svg>
    </div>
  )
}
ManhattanPlot.propTypes = {
  data: PropTypes.array.isRequired,
}
export default ManhattanPlot
