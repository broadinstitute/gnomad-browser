/* eslint-disable no-shadow */
import PropTypes from 'prop-types'
import React from 'react'
import R from 'ramda'

import { area, line, curveCatmullRom } from 'd3-shape'
import { range } from 'd3-array'
import { path } from 'd3-path'
import { scaleLinear } from 'd3-scale'

import css from './styles.css'

const SashimiTrack = ({
  title,
  width,
  height,
  leftPanelWidth,
  xScale,
  positionOffset,
  domainMax,
  coverage,
  coverageColour,
  junctions,
}) => {
  const coverageColor = coverageColour

  const scaleCoverage = (xScale, coverage) => {
    const coverageScaled = coverage.map((base) => {
      const newPosition = Math.floor(xScale(positionOffset(base.pos).offsetPosition))
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

  const calculateJunctionPositions = (junctions) => {
    const sashimiLabelSpacing = 50

    return junctions.map((junction, i) => {
      const [start, mid, stop] = junction.positions

      const startOffset = positionOffset(start.pos)
      const stopOffset = positionOffset(stop.pos)

      const startScaled = xScale(startOffset.offsetPosition)
      const stopScaled = xScale(stopOffset.offsetPosition)

      const mid1Scaled = ((startScaled + stopScaled) / 2) - sashimiLabelSpacing
      const mid2Scaled = ((startScaled + stopScaled) / 2) + sashimiLabelSpacing

      const startJunction = {
        xpos: startScaled,
        ypos: 0,
      }
      const midpoint1 = {
        xpos: mid1Scaled,
        ypos: 300 * (i + 1),
      }
      const midpoint2 = {
        xpos: mid2Scaled,
        ypos: 300 * (i + 1),
      }
      const stopJunction = {
        xpos: stopScaled,
        ypos: 0,
      }

      return {
        ...junction,
        positions: [startJunction, midpoint1, midpoint2, stopJunction],
      }
    })
  }

  const sashimiJunctionPath = (junction) => {
    const sashimiJunctionLine = line()
      .defined((junction) => {
        return junction.xpos !== undefined
      })
      .x((junction) => {
        return junction.xpos
      })
      .y(junction => yScale(junction.ypos))
      .curve(curveCatmullRom.alpha(1))

    const [start, mid1, mid2, stop] = junction.positions

    return (
      <g>
        <path
          key={`${junction.series}-${start.xpos}-${stop.xpos}-${junction.reading}`}
          d={sashimiJunctionLine(junction.positions)}
          fill={'none'}
          stroke={coverageColour}
          strokeWidth={4}
        />
        <rect
          x={mid1.xpos + 25}
          y={yScale(mid1.ypos + 60)}
          width={50}
          fill={'white'}
          height={30}
          strokeWidth={1}
          stroke={'white'}
        />
        <text
          x={mid1.xpos + 50}
          y={yScale(mid1.ypos)}
          style={{ textAnchor: 'middle' }}
        >
          {junction.reading}
        </text>
      </g>
    )
  }

  const junctionPaths = calculateJunctionPositions(junctions)
    .map(junction => sashimiJunctionPath(junction))

  return (
    <div styles={{ display: 'flex' }}>
      <div
        style={{
          width: leftPanelWidth,
          display: 'flex',
          justifyContent: 'flexEnd',
        }}
      >
        <svg width={50} height={height}>
          <text
            styles={{
              fontSize: '12px',
              textAnchor: 'middle',
            }}
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
                  styles={{
                    fontSize: '8px',
                    textAnchor: 'end',
                  }}
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
            {junctionPaths}
          </g>
        </svg>
      </div>
    </div>
  )
}
SashimiTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  coverage: PropTypes.array.isRequired,
  junctions: PropTypes.array.isRequired,
}

export default SashimiTrack
