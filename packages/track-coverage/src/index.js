import React from 'react'
import PropTypes from 'prop-types'
import R from 'ramda'

import { area, line } from 'd3-shape'
import { range } from 'd3-array'
import { path } from 'd3-path'
import { scaleLinear } from 'd3-scale'

import { getMaxMeanFromCoverageDatasets } from '@broad/utilities/src/plotting'

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
  totalBp,
}) => {

  const scaleCoverage = (xScaleCoverage, coverage) => {
    const coverageScaled = coverage.map((base) => {
      const newPosition = Math.floor(xScaleCoverage(positionOffset(base.pos).offsetPosition))
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
    const [min, max] = xScaleCoverage.range()
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

  const dataAreaLarge = area()
    .x(base => base.scaledPosition)
    .y0(_ => height)  // eslint-disable-line
    .y1(base => yScale(base.mean))

  const dataAreaSmall = area()
    .defined((base) => {
      return !isNaN(base.mean)
        && positionOffset(base.pos).offsetPosition !== undefined
    })
    .x(base => xScale(positionOffset(base.pos).offsetPosition))
    .y0(_ => height)  // eslint-disable-line
    .y1(base => yScale(base.mean))

  const dataLine = line()
    .defined((base) => {
      return !isNaN(base.mean)
        && positionOffset(base.pos).offsetPosition !== undefined
    })
    .x(base => xScale(positionOffset(base.pos).offsetPosition))
    .y(base => yScale(base.mean))

  const renderAreaLarge = (dataset) => {
    return (
      <path
        key={`cov-series-${dataset.name}-area`}
        d={dataAreaLarge(scaleCoverage(xScale, dataset.data))}
        fill={dataset.color}
        opacity={dataset.opacity}
      />
    )
  }
  const renderAreaSmall = (dataset) => {
    return (
      <path
        key={`cov-series-${dataset.name}-area`}
        d={dataAreaSmall(dataset.data)}
        fill={dataset.color}
        opacity={dataset.opacity}
      />
    )
  }
  const renderLine = (dataset) => {
    return (
      <path
        key={`cov-series-${dataset.name}-line`}
        d={dataLine(dataset.data)}
        fill={'none'}
        stroke={dataset.color}
        opacity={1}
        strokeWidth={dataset.strokeWidth}
      />
    )
  }

  const getX = base => xScale(positionOffset(base.pos).offsetPosition)
  const getY = base => yScale(base.mean)
  const renderBars = (dataset) => {
    const barWidth = (width / totalBp) - 1
    return dataset.data.map((base) => {
      const barHeight = height - getY(base)
      const xValue = getX(base)
      if (!isNaN(xValue) && xValue !== undefined ) {
        return (
          <rect
            x={xValue}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={dataset.color}
            stroke={'none'}
            opacity={dataset.opacity}
          />
        )
      }
    })
  }

  const legend = (
    <ul
      style={{
        display: 'flex',
        flexDirection: 'row',
        listStyleType: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {dataConfig.datasets.map(dataset => (
        <li
          key={dataset.name}
          style={{
            display: 'flex',
            marginLeft: '1em',
          }}
        >
          <span
            style={{
              background: dataset.color,
              border: '1px solid black',
              display: 'inline-block',
              height: '1em',
              marginRight: '0.5em',
              width: '1em',
            }}
          />
          {dataset.name}
        </li>
      ))}
    </ul>
  )

  const plots = dataConfig.datasets.map((dataset) => {
    if (dataset.data) {
      if (totalBp < 100) {
        return renderBars(dataset)
      }
      if (totalBp < 2000) {
        return renderAreaSmall(dataset)
      }
      switch (dataset.type) {
        case 'area':
          return renderAreaLarge(dataset)
        case 'line':
          return renderLine(dataset)
        case 'line-area':
          return (
            <g>
              {renderAreaLarge(dataset)}
              {renderLine(dataset)}
            </g>
          )
        default:
          return renderArea(dataset)
      }
    }
  })

  const [yScaleDomainMin, yScaleDomainMax] = yScale.domain()
  const [yScaleRangeMax, yScaleRangeMin] = yScale.range()  // eslint-disable-line

  const incrementSize = Math.floor(yScaleDomainMax / yTickNumber)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginLeft: leftPanelWidth,
          width: `${width}px`,
        }}
      >
        {legend}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: leftPanelWidth,
          }}
        >
          <svg width={50} height={yScaleRangeMax}>
            <text
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                textAnchor: 'middle',
              }}
              x={10}
              y={yScaleRangeMax / 2}
              transform={`rotate(270 10 ${yScaleRangeMax / 2})`}
            >
              {title}
            </text>
            <g>
              {/* <text
                style={{
                  fontSize: '12px',
                  textAnchor: 'end',
                }}
                x={40}
                y={yScaleRangeMax + 1}
              >
                0
              </text> */}
              {R.tail(range(yScaleDomainMin, yScaleDomainMax, incrementSize)).map(tick =>
                (<g key={`ytick-${tick}`}>
                  <text
                    style={{
                      fontSize: '12px',
                      textAnchor: 'end',
                    }}
                    x={40}
                    y={yScaleRangeMax - (yScale(tick) - 4)}
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
                </g>)
              )}
            </g>
          </svg>
        </div>
        <div>
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
            <g>
              {plots}
            </g>
          </svg>
        </div>
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
