/* eslint-disable no-mixed-operators */
import React from 'react'
import R from 'ramda'
import moment from 'moment'
import {
  scaleLinear,
  scaleBand,
 } from 'd3-scale'

import {
  max,
  range,
} from 'd3-array'

import css from './styles.css'

import exacSessions from '/Users/msolomon/lens/resources/170610-exac-sessions.json'

console.log(exacSessions)

const Plot = ({
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
    const numberOfTicks = 20
    const dataxobj = datax.map((d, i) => ({ ix: i, datum: Number(d) }))
    const tickData = dataxobj.filter((x, i) => {

      // console.log((i % (datax.length / numberOfTicks)))
      return i % (Math.floor(datax.length / numberOfTicks)) === 0
    })
    const textRotationDegrees = 45
    // console.log(tickData)
    return (
      <g>
        {tickData.map((elem, i) => {
          return (
            <g key={`xtick-${elem.datum}-${i}`}>
              <line
                x1={padding + xscale(elem.ix)}
                x2={padding + xscale(elem.ix)}
                y1={height - padding + 5}
                y2={height - padding}
                stroke={'black'}
              />
              <text
                className={css.xTickText}
                x={padding + xscale(elem.ix)}
                y={height - padding}
                transform={`rotate(${360 - textRotationDegrees} ${padding + xscale(elem.ix)} ${height})`}
              >
                {xticks && moment.unix(elem.datum / 1000).format('MMM YY')}
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

const Traffic = () => {
  return (
    <div className={css.component}>
      <Plot
        title={'gnomAD browser sessions per day'}
        datax={Object.keys(exacSessions.sessions)}
        datay={Object.values(exacSessions.sessions)}
        ytitle={'Sessions'}
        xtitle={'Date'}
        xticks
        width={1300}
        height={700}
      />
    </div>
  )
}
export default Traffic