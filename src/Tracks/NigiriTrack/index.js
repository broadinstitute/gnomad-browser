import React, { PropTypes } from 'react'
import R from 'ramda'

import { area, line } from 'd3-shape'
import { range } from 'd3-array'
import { path } from 'd3-path'
import { scaleLinear } from 'd3-scale'

import css from './styles.css'

const NigiriTrack = ({
  title,
  width,
  height,
  leftPanelWidth,
  xScale,
  positionOffset,
  domainMax,
  coverage,
  junctions,
}) => {
  // console.log(coverage)
  const coverageColor = '#001B42'

  const scaleCoverage = (xScale, coverage) => {
    const coverageScaled = coverage.map((base) => {
      // console.log(base.pos)
      const newPosition = Math.floor(xScale(positionOffset(base.pos).offsetPosition))
      // console.log(newPosition)
      if (newPosition !== undefined || newPosition !== NaN) {
        return ({
          reading: base.reading,
          scaledPosition: newPosition,
        })
      }
      return null
    })
    const downSampled = R.uniqBy(b => b.scaledPosition, coverageScaled)
    const dict = downSampled.reduce((acc, base) => {
      const { scaledPosition } = base
      return {
        ...acc,
        [scaledPosition]: base.reading,
      }
    }, {})
    const [min, max] = xScale.range()
    const final = range(min, max).map((i) => {
      if (dict[i]) {
        return { scaledPosition: i, reading: dict[i] }
      }
      return { scaledPosition: i, reading: 0 }
    })
    return final
  }


  const yScale = scaleLinear()
    .domain([0, domainMax])
    .range([200, 0])

  const coverageArea = area()
    .x(base => base.scaledPosition)
    .y0(_ => height)  // eslint-disable-line
    .y1(base => yScale(base.reading))

  // const genomeCoverageLine = line()
  //   .defined((base) => {
  //     return !isNaN(base.mean)
  //       && positionOffset(base.pos).offsetPosition !== undefined
  //   })
  //   .x(base => xScale(positionOffset(base.pos).offsetPosition))
  //   .y(base => yScale(base.mean))

  // let genomeCov
  // if (genomeCoverage) {
  //   genomeCov = (
  //     <path
  //       d={genomeCoverageLine(genomeCoverage)}
  //       fill={'none'}
  //       stroke={genomeColor}
  //       strokeWidth={4}
  //     />
  //   )
  // }
  // console.log(coverageArea(scaleCoverage(xScale, coverage)))
  // console.log(scaleCoverage(xScale, coverage))
  return (
    <div className={css.coverageTrack}>
      <div
        className={css.coverageYAxis}
        style={{
          width: leftPanelWidth,
        }}
      >
        <svg width={50} height={height}>
          <text
            className={css.ylabel}
            x={10}
            y={height / 2}
            transform={`rotate(270 10 ${height / 2})`}
          >
            {title}
          </text>
          <g>
            {range(0, 190, 10).map(tick =>
              <g key={`ytick-${tick}`}>
                <text
                  className={css.yticktext}
                  x={40}
                  y={height - tick}
                >
                  {tick / 2}
                </text>
                <line
                  x1={45}
                  x2={50}
                  y1={height - tick}
                  y2={height - tick}
                  stroke={'black'}
                  strokeWidth={1}
                  key={`coverage-y-axis-${tick}`}
                />
              </g>,
            )}
          </g>
        </svg>
      </div>
      <div className={css.coverageArea}>
        <svg
          width={width}
          height={height}
        >
          <line
            x1={0}
            x2={width}
            y1={height}
            y2={height}
            stroke={'black'}
            strokeWidth={1}
          />
          <g className={css.coverage}>
            <path
              d={coverageArea(scaleCoverage(xScale, coverage))}
              fill={coverageColor}
            />
            {/*genomeCov*/}
          </g>
        </svg>
      </div>
    </div>
  )
}
NigiriTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  coverage: PropTypes.array.isRequired,
  junctions: PropTypes.array.isRequired,
}

export default NigiriTrack
