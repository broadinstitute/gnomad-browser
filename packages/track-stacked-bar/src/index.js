/* eslint-disable react/prop-types */
/* eslint-disable react/no-array-index-key */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { scaleLinear } from 'd3-scale'

const TrackWrapper = styled.div`
  width: 100%;
  border: 1px solid #000;
`

const TrackStackedBar = ({
  data,
  height,
  // leftPanelWidth,
  positionOffset,
  // invertOffset,
  xScale,
  width,
  // offsetRegions,
  // regionAttributes,
  // padding,
}) => {
  const margin = {
    top: 20,
    bottom: 20,
    right: 20,
    left: 20,
  }
  // console.log(data)
  const yMax = height - margin.top - margin.bottom

  const x = (d) => {
    return positionOffset(d.pos).offsetPosition
  }
  const y = (d) => {
    // console.log(d.bucket_consequence_counts.find(csq => csq.consequence === 'intron_variant').count)
    return d.bucket_consequence_counts.find(csq => csq.consequence === 'intron_variant').count
  }

  const yScale = scaleLinear()
    .domain([0, Math.max(...data.map(y))])
    .range([yMax, 0])

  const compose = (scale, accessor) => data => scale(accessor(data))
  const xPoint = compose(xScale, x)
  const yPoint = compose(yScale, y)
  const barWidth = (width / data.length) - 3
  return (
    <TrackWrapper>
      <svg width={width} height={height}>
        {data.map((d, i) => {
          const barHeight = yMax - yPoint(d)
          return (
            <g key={`bar-${i}`}>
              <rect
                x={xPoint(d)}
                y={yMax - barHeight}
                width={barWidth}
                height={barHeight}
                fill={'#fc2e1c'}
                stroke={'black'}
              />
            </g>
          )
        })}
      </svg>
    </TrackWrapper>
  )
}

TrackStackedBar.propTypes = {
  data: PropTypes.object.isRequired,
}

export default TrackStackedBar
