import React, { PropTypes } from 'react'
import R from 'ramda'

import { area, line } from 'd3-shape'
import { range } from 'd3-array'
import { path } from 'd3-path'
import { scaleLinear } from 'd3-scale'

import { getMaxMeanFromCoverageDatasets } from 'utilities/plotting'

import css from './styles.css'

const CoverageTrack = ({
  title,
  width,
  height,
  leftPanelWidth,
  xScale,
  positionOffset,
  dataConfig,
  yTickNumber,
  yMax,
}) => {
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

  const dataYDomainMax = yMax || getMaxMeanFromCoverageDatasets(dataConfig)

  const yScale = scaleLinear()
    .domain([0, dataYDomainMax])
    .range([height, 0])

  const dataArea = area()
    .x(base => base.scaledPosition)
    .y0(_ => height)  // eslint-disable-line
    .y1(base => yScale(base.mean))

  const dataLine = line()
    .defined((base) => {
      return !isNaN(base.mean)
        && positionOffset(base.pos).offsetPosition !== undefined
    })
    .x(base => xScale(positionOffset(base.pos).offsetPosition))
    .y(base => yScale(base.mean))

  const renderArea = (dataset) => {
    return (
      <path
        key={`cov-series-${dataset.name}`}
        d={dataArea(scaleCoverage(xScale, dataset.data))}
        fill={dataset.color}
        opacity={dataset.opacity}
      />
    )
  }
  const renderLine = (dataset) => {
    return (
      <path
        key={`cov-series-${dataset.name}`}
        d={dataLine(dataset.data)}
        fill={'none'}
        stroke={dataset.color}
        opacity={dataset.opacity}
        strokeWidth={dataset.strokeWidth}
      />
    )
  }

  const plots = dataConfig.datasets.map((dataset) => {
    switch (dataset.type) {
      case 'area':
        return renderArea(dataset)
      case 'line':
        return renderLine(dataset)
      default:
        return renderArea(dataset)
    }
  })

  const [yScaleDomainMin, yScaleDomainMax] = yScale.domain()
  const [yScaleRangeMax, yScaleRangeMin] = yScale.range()

  const incrementSize = Math.floor(yScaleDomainMax / yTickNumber)

  return (
    <div className={css.coverageTrack}>
      <div
        className={css.coverageYAxis}
        style={{
          width: leftPanelWidth,
        }}
      >
        <svg width={50} height={yScaleRangeMax}>
          <text
            className={css.ylabel}
            x={10}
            y={yScaleRangeMax / 2}
            transform={`rotate(270 10 ${yScaleRangeMax / 2})`}
          >
            {title}
          </text>
          <g>
            <text
              className={css.yticktext}
              x={40}
              y={yScaleRangeMax}
            >
              0
            </text>
            {R.tail(range(yScaleDomainMin, yScaleDomainMax, incrementSize)).map(tick =>
              <g key={`ytick-${tick}`}>
                <text
                  className={css.yticktext}
                  x={40}
                  y={yScaleRangeMax - yScale(tick) + 2}
                >
                  {yScaleDomainMax - tick}
                </text>
                <line
                  x1={42}
                  x2={48}
                  y1={yScaleRangeMax - yScale(tick)}
                  y2={yScaleRangeMax - yScale(tick)}
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
            y1={yScaleRangeMax}
            y2={yScaleRangeMax}
            stroke={'black'}
            strokeWidth={1}
          />
          <g className={css.coverage}>
            {plots}
          </g>
        </svg>
      </div>
    </div>
  )
}
CoverageTrack.propTypes = {
  title: PropTypes.string,
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  dataConfig: PropTypes.object.isRequired,
  yTickNumber: PropTypes.number,
  yMax: PropTypes.number,
}
CoverageTrack.defaultProps = {
  title: '',
  yTickNumber: 5,
  yMax: null,
}

export default CoverageTrack
