/* eslint-disable no-mixed-operators */
/* eslint-disable react/prop-types */
import React from 'react'
import R from 'ramda'
import {
  scaleLinear,
  scaleBand,
 } from 'd3-scale'
import {
  max,
  range,
} from 'd3-array'
import { line } from 'd3-shape'
import css from './styles.css'

const LineGraph = ({
  title,
  datax,
  datay,
  ytitle,
  xtitle,
  width,
  height,
}) => {
  const data = R.zip(datax, datay)
  const padding = 30

  const yscale = scaleLinear()
    .domain([0, max(datay) + (max(datay) * 0.2)])
    .range([0, height - (padding * 2)])
  const xscale = scaleLinear()
    .domain([0, max(datax) + (max(datax) * 0.2)])
    .range([0, width - (padding * 2)])
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
      x={10}
      y={height / 2}
      transform={`rotate(270 10 ${height / 2})`}
    >
      {xtitle}
    </text>
  )
  const Xlabel = () => (
    <text
      className={css.xlabel}
      x={width / 2}
      y={height - 5}
    >
      {ytitle}
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
            <g key={x}>
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
                {x}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  const LineSVG = line()
    .x(d => xscale(d[0]))
    .y(d => yscale(d[1]))

  const Line = () => (
    <path
      d={LineSVG(data)}
      fill={'none'}
      stroke={'blue'}
      strokeWidth={4}
    />
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
        <Line />
      </svg>
    </div>
  )
}

export default LineGraph
