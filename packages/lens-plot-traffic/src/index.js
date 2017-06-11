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
import combined from '/Users/msolomon/lens/resources/170611-combine-sessions.json'

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

  const xscale = scaleBand()
    .domain(range(data.length))
    .rangeRound([0, width - (padding * 2)])
    // .paddingOuter(0.5)
    // .align([0.5])

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
  const exacBars = (
    <g>
      {data.map((value, i) => {
        console.log(value.exac_sessions)
        console.log(yscale(value.exac_sessions))
        return (
          <rect
            className={css.bars}
            x={padding + xscale(i)}
            y={height - padding - yscale(value.exac_sessions)}
            width={xscale.bandwidth()}
            height={yscale(value.exac_sessions)}
            fill={'#0D47A1'}
            stroke={'#0D47A1'}
            key={`bar-${value.exac_sessions}-${i}`}
          />
        )
      })}
    </g>
  )
  const gnomadBars = (
    <g>
      {data.map((value, i) => (
        <rect
          className={css.bars}
          x={padding + xscale(i)}
          y={height - padding - yscale(value.gnomad_sessions) - yscale(value.exac_sessions)}
          width={xscale.bandwidth()}
          height={yscale(value.gnomad_sessions)}
          fill={'green'}
          stroke={'green'}
          key={`bar-${value.gnomad_sessions}-${i}`}
        />
      ))}
    </g>
  )

  // const barSeries = (ys) => (
  //   <g>
  //     {ys.map((value, i) => (
  //       <rect
  //         className={css.bars}
  //         x={padding + xscale(i)}
  //         y={height - padding - yscale(value)}
  //         width={xscale.bandwidth()}
  //         height={yscale(value)}
  //         fill={'#0D47A1'}
  //         stroke={'#0D47A1'}
  //         key={`bar-${value}-${i}`}
  //       />
  //     ))}
  //   </g>
  // )
    // const stackedData = datasets.map((dataset, datasetIndex) =>
    //   data[dataset].map((datum, datumIndex) => {
    //     const previousY = datasetIndex === 0 ? 0 : data[datasetIndex - 1][datumIndex]
    //     return ({ y: previousY, yHeight: datum })
    //   }))
    // return stackedData.map(barSeries)
  // }

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
        {exacBars}
        {gnomadBars}
      </svg>
    </div>
  )
}

const Traffic = () => {
  const data = combined.map((datum, i) => ({ ...datum, ix: i }))
  console.log(data)
  return (
    <div className={css.component}>
      <Plot
        title={'ExAC/gnomAD browser sessions per day'}
        data={R.drop(30, data)}
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
