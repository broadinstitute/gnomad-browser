/* eslint-disable no-mixed-operators */
import React from 'react'
import R from 'ramda'
import moment from 'moment'
import {
  scaleLinear,
  scaleBand,
 } from 'd3-scale'

import { area, line } from 'd3-shape'

import { path } from 'd3-path'

import {
  max,
  range,
} from 'd3-array'

import css from './styles.css'

import exacSessions from '@resources/gwas-eg.json'  // eslint-disable-line
import combined from '@resources/gwas-eg.json'  // eslint-disable-line

const Plot = ({
  title,
  data,
  datasets,
  ytitle,
  xtitle,
  width,
  height,
  xticks,
}) => {
  const padding = 75
  const cumulative = data.map(datum =>
    datasets.reduce((total, dataset) => total + datum[dataset], 0))
  const maxY = max(cumulative)
  const yscale = scaleLinear()
    .domain([0, maxY + (maxY * 0.1)])
    .range([0, height - (padding * 2)])

  const xscale = scaleLinear()
    .domain(range(data.length))
    .rangeRound([0, width - (padding * 2)])

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
      transform={`rotate(270 ${padding / 3} ${height / 2})`}
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
                y={height - padding - yscale(t) + 3}
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
    const numberOfTicks = 18
    const tickData = data.filter((x, i) => {
      return i % (Math.floor(data.length / numberOfTicks)) === 0
    })
    const textRotationDegrees = 45
    return (
      <g>
        {R.init(tickData).map((elem, i) => {
          return (
            <g key={`xtick-${elem.date}-${i}`}>
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
                y={height - padding + 30}
                transform={`rotate(${360 - textRotationDegrees} ${padding + xscale(elem.ix)} ${height - padding + 30})`}
              >
                {xticks && moment(elem.date).format('MMM YYYY')}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  const dataArea = area()
    .x(datum => xscale(datum.ix))
    .y0(datum => height - padding - yscale(datum.exac_sessions))  // eslint-disable-line
    .y1(datum => yscale(datum.exac_sessions))

  const renderArea = (data) => {
    return (
      <g>
        <path
          key={`exac-sessions-area`}
          d={dataArea(data)}
          fill={'#0D47A1'}
        />
        <path
          key={`gnomad-sessions-area`}
          d={dataArea(data)}
          fill={'green'}
        />
      </g>
    )
  }

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
        {renderArea(data)}
      </svg>
    </div>
  )
}

const Traffic = () => {
  const data = combined.map((datum, i) => ({ ...datum, ix: i }))

  const filterWeekends = data.filter(datum => {
    const day = moment(datum.date).format('dddd')
    return (day !== 'Sunday' && day !== 'Saturday' && day !== 'Friday')
  })
  return (
    <div className={css.component}>
      <Plot
        title={'ExAC/gnomAD browser sessions per day'}
        data={R.drop(30, filterWeekends)}
        datasets={['exac_sessions', 'gnomad_sessions']}
        ytitle={'Sessions per day'}
        xtitle={'Month'}
        xticks
        width={1200}
        height={500}

      />
    </div>
  )
}
export default Traffic
