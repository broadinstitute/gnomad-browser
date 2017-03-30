import React, { PropTypes } from 'react'
import R from 'ramda'

import { area, line } from 'd3-shape'
import { range } from 'd3-array'
import { path } from 'd3-path'
import { scaleLinear } from 'd3-scale'

import css from './styles.css'

const CoverageTrack = ({
  width,
  height,
  leftPanelWidth,
  xScale,
  positionOffset,
  exomeCoverage,
  genomeCoverage,
}) => {
  const exomeColor = 'rgba(70, 130, 180, 1)'
  const genomeColor = 'rgba(115, 171, 61,  1)'

  const scaleCoverage = (xScale, coverage) => {
    const coverageScaled = coverage.map((base) => {
      const newPosition = Math.floor(xScale(positionOffset(base.pos).offsetPosition))
      if (newPosition !== undefined) {
        return ({
          mean: base.mean,
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
        [scaledPosition]: base.mean,
      }
    }, {})
    const [min, max] = xScale.range()
    const final = range(min, max).map((i) => {
      if (dict[i]) {
        return { scaledPosition: i, mean: dict[i] }
      }
      return { scaledPosition: i, mean: 0 }
    })
    return final
  }

  scaleCoverage(xScale, exomeCoverage)
  const yScale = scaleLinear()
    .domain([0, 100])
    .range([200, 0])

  const exomeCoverageArea = area()
    .x(base => base.scaledPosition)
    .y0(_ => height)  // eslint-disable-line
    .y1(base => yScale(base.mean))

  const genomeCoverageLine = line()
    .defined((base) => {
      return !isNaN(base.mean)
        && positionOffset(base.pos).offsetPosition !== undefined
    })
    .x(base => xScale(positionOffset(base.pos).offsetPosition))
    .y(base => yScale(base.mean))

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
            Coverage
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
          <g className={css.coverage}>
            <path
              d={exomeCoverageArea(scaleCoverage(xScale, exomeCoverage))}
              fill={exomeColor}
            />
            <path
              d={genomeCoverageLine(genomeCoverage)}
              fill={'none'}
              stroke={genomeColor}
              strokeWidth={4}
            />
          </g>
        </svg>
      </div>
    </div>
  )
}
CoverageTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  exomeCoverage: PropTypes.array.isRequired,
  genomeCoverage: PropTypes.array.isRequired,
}

export default CoverageTrack
