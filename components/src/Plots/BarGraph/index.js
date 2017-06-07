/* eslint-disable no-mixed-operators */
import React from 'react'
import {
  scaleLinear,
  scaleBand,
 } from 'd3-scale'
import {
  max,
  range,
} from 'd3-array'
import css from './styles.css'

const BarGraph = ({
  title,
  datax,
  datay,
  ytitle,
  xtitle,
  width,
  height,
  xticks,
}) => {
  const padding = 50

  const yscale = scaleLinear()
    .domain([0, max(datay) + (max(datay) * 0.2)])
    .range([0, height - (padding * 2)])
  const xscale = scaleBand()
    .domain(range(datax.length))
    .rangeRound([0, width - (padding * 2)])
    .paddingOuter(0.5)
    .paddingInner(0.3)
  const Background = () => (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={'#FFFFFF'}
      stroke={'#FFFFFF'}
    />
  )
  const AxesBackground = () => (
    <rect
      x={padding}
      y={padding}
      width={width - padding * 2}
      height={height - padding * 2}
      fill={'#FFFFFF'}
    />
  )
  const Title = () => (
    <text
      className={css.title}
      x={width / 2}
      y={padding / 2}
    >
      {title}
    </text>
  )
  const Ylabel = () => (
    <text
      className={css.ylabel}
      x={5}
      y={height / 2}
      transform={`rotate(270 10 ${height / 2})`}
    >
      {ytitle}
    </text>
  )
  const Xlabel = () => (
    <text
      className={css.xlabel}
      x={width / 2}
      y={height - 5}
    >
      {xtitle}
    </text>
  )
  const Yaxis = () => (
    <line
      x1={padding}
      x2={padding}
      y1={height - padding}
      y2={padding}
      stroke={'#FFFFFF'}
    />
  )
  const Xaxis = () => (
    <line
      x1={padding}
      x2={width - padding}
      y1={height - padding}
      y2={height - padding}
      stroke={'black'}
    />
  )
  const Yticks = () => {
    return (
      <g>
        {yscale.ticks().map(t => {
          return (
            <g key={t}>
              <line
                x1={padding}
                x2={width - padding}
                y1={height - padding - yscale(t)}
                y2={height - padding - yscale(t)}
                stroke={'#BDBDBD'}
              />
              <text
                className={css.yTickText}
                x={padding - 5}
                y={height - padding - yscale(t)}
              >
               {t}
              </text>
            </g>
          )
        })}
      </g>
    )
  }
  const Xticks = () => {
    // console.log(x)
    return (
      <g>
        {datax.map((x, i) => {
          return (
            <g key={`xtick-${x}-${i}`}>
              <line
                x1={padding + xscale(i)}
                x2={padding + xscale(i)}
                y1={height - padding}
                y2={height - padding - 5}
                stroke={'black'}
              />
              <text
                className={css.xTickText}
                x={padding + xscale(i)}
                y={height - padding + 10}
              >
                {xticks && x}
              </text>
            </g>
          )
        })}
      </g>
    )
  }
  const Bars = () => (
    <g>
      {datay.map((value, i) => (
        <rect
          className={css.bars}
          x={padding + xscale(i)}
          y={height - padding - yscale(value)}
          width={xscale.bandwidth()}
          height={yscale(value)}
          fill={'#0D47A1'}
          stroke={'black'}
          key={`bar-${value}-${i}`}
        />
      ))}
    </g>
  )
  return (
    <div className={css.barGraph}>
      <svg width={width} height={height}>
        <Background />
        <AxesBackground />
        <Title />
        <Xlabel />
        <Ylabel />
        <Yaxis />
        <Xaxis />
        <Yticks />
        <Xticks />
        <Bars />
      </svg>
    </div>
  )
}

export default BarGraph
