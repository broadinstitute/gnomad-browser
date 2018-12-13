/* eslint-disable react/prop-types */
/* eslint-disable react/no-array-index-key */
/* eslint-disable camelcase */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { scaleLinear } from 'd3-scale'
import { AxisLeft, AxisBottom } from '@vx/axis'
import { scaleOrdinal } from '@vx/scale'
import { BarStack } from '@vx/shape'

const TrackWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  ${'' /* border: 1px solid #000; */}
`

const TrackStackedBar = ({
  data,
  height,
  leftPanelWidth,
  positionOffset,
  // invertOffset,
  xScale,
  width,
  // offsetRegions,
  hideIntrons,
}) => {
  const margin = {
    top: 20,
    bottom: 0,
    right: 20,
    left: 20,
  }
  const yMax = height - margin.top - margin.bottom

  const consequencesToDisplay = [
    'missense_variant',
    'synonymous_variant',
    'splice_region_variant',
    'stop_gained',
    'frameshift_variant',
    'inframe_deletion',
    'splice_donor_variant',
    'splice_acceptor_variant',
  ]

  const filterConsequenceCounts = (data) => {
    return data.map((interval) => {
      return {
        ...interval,
        bucket_consequence_counts: interval.bucket_consequence_counts
          .filter(csq_count => (
            consequencesToDisplay.includes(csq_count.consequence)))
      }
    })
  }

  // const data2 = filterConsequenceCounts(data).map((interval) => {
  const data2 = data.map((interval) => {
    return {
      pos: interval.pos,
      ...interval.bucket_consequence_counts.reduce((acc, csq_count) => ({
        ...acc,
        [csq_count.consequence]: csq_count.count,
      }), {})
    }
  })

  const bucketTotals = (buckets) => {
    return buckets.map((bucket) => {
      return Object.keys(bucket).reduce((acc, key) => {
        if (key !== 'pos') {
          return acc + bucket[key]
        }
        return acc
      }, 0)
    })
  }

  const x = (d) => {
    return positionOffset(d.pos).offsetPosition
  }
  const y = (d, key) => {
    return d[key]
  }
  const yScale = scaleLinear()
    .domain([0, Math.max(...bucketTotals(data2))])
    .range([yMax, 0])

  const compose = (scale, accessor) => (data, key) => scale(accessor(data, key))
  const xPoint = compose(xScale, x)
  const yPoint = compose(yScale, y)
  const barWidth = (width / data.length) - 3

  const colors = {
    intron_variant: 'gray',
    missense_variant: 'orange',
    synonymous_variant: 'green',
    splice_region_variant: 'gray',
    stop_gained: 'red',
    frameshift_variant: 'red',
    inframe_deletion: 'red',
    splice_donor_variant: 'red',
    splice_acceptor_variant: 'red',
    '3_prime_UTR_variant': 'gray'
  }

  const colorKeys = Object.keys(colors)

  return (
    <TrackWrapper>
      <svg width={leftPanelWidth} height={height}>
        <AxisLeft
          scale={yScale}
          top={0}
          left={leftPanelWidth - 5}
          label={'Variants binned'}
          fontSize={'14px'}
          stroke={'#1b1a1e'}
          tickTextFill={'#1b1a1e'}
          numTicks={5}
          labelProps={{textAnchor: 'middle', fontSize: 12}}
          // hideTicks
        />
      </svg>
      <svg width={width} height={height}>
        {data2.map((d, i1) => {
          let lastHeight = 0
          return Object.keys(d).map((key, i2) => {
            if (key !== 'pos') {
              const h = lastHeight
              const barHeight = yMax - yPoint(d, key)
              const color = colorKeys.includes(key) ? colors[key] : 'gray'
              const bar = (
                <g key={`bar-${key}-${i1}-${i2}`}>
                  <rect
                    className={`bar-${key}-${i1}-${i2}`}
                    x={xPoint(d)}
                    y={yMax - barHeight}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    stroke={'black'}
                  />
                </g>
              )
              lastHeight += yPoint(d, key)
              return bar
            }
          })
        })}
      </svg>
    </TrackWrapper>
  )
}

TrackStackedBar.propTypes = {
  data: PropTypes.array.isRequired,
}

export default TrackStackedBar
