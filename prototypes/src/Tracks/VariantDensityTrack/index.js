/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */
/* eslint-disable react/prop-types */

import React, { PropTypes } from 'react'
import R from 'ramda'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'
import { range, max } from 'd3-array'
import { line } from 'd3-shape'
import { scaleLinear } from 'd3-scale'

import { connect } from 'react-redux'

import {
  searchFilteredVariants,
} from '@broad/gene-page/src/resources/table'


import css from './styles.css'

console.log(css)

const VariantAxis = ({ title, height, leftPanelWidth, trackYScale }) => {
  const YTicks = trackYScale ? () => {
    return (
        <g>
          {trackYScale.ticks(3).map(t => {
            return (
              <g key={t}>
                {/*<line
                  x1={leftPanelWidth - 10}
                  x2={leftPanelWidth - 5}
                  y1={trackYScale(t)}
                  y2={trackYScale(t)}
                  stroke={'black'}
                />*/}
                <text
                  x={leftPanelWidth - 30}
                  y={trackYScale(t) + 5}
                >
                  {t}
                </text>
              </g>
            )
          })}
        </g>
    )
  } : null
  const YAxis = () => {
    return (
      <svg width={leftPanelWidth} height={height}>
        <text
          className={css.yLabel}
          x={5}
          y={height / 2}

        >
          {title}
        </text>
        {trackYScale && <YTicks />}
      </svg>
    )
  }
  return (
    <div
      style={{ width: leftPanelWidth }}
    >
      <YAxis/>
      {/*<div className={css.variantAxisName} style={{ fontSize: 12 }}>
        {title}
      </div>*/}
    </div>
  )
}
VariantAxis.propTypes = {
  title: PropTypes.string.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
}

const VariantDensityTrack = ({
  height = 80,
  width,
  invertOffset,
  variants,
  leftPanelWidth
}) => {
  const makeVariantPlotData = (variants) => {

    const slidingWindowBp = 500

    const variantDensity = range(30, width, 1).map(i => {
      const pos = invertOffset(i)
      const left = getTableIndexByPosition(pos - slidingWindowBp, variants)
      const right = getTableIndexByPosition(pos + slidingWindowBp, variants)
      return { pos, x: i, density: variants.slice(left, right).length / slidingWindowBp }
    })

    const yMax = max(R.pluck('density', variantDensity))
    const densityYScale = scaleLinear()
      .domain([0, yMax])
      .range([height - 25, 10])
    const variantDensityLine = line()
      .defined((base) => {
        return !isNaN(base.density)
      })
      .x(base => base.x)
      .y(base => densityYScale(base.density))

    return {
      variantDensity,
      variantDensityLine,
      densityYScale,
    }
  }

  const jsVariants = variants.toJS()

  const { variantDensityLine, densityYScale, variantDensity } = makeVariantPlotData(jsVariants)

  const renderLine = (data) => {
    return (
      <path
        d={variantDensityLine(data)}
        fill={'none'}
        stroke={'black'}
        opacity={1}
        strokeWidth={1}
      />
    )
  }

  const renderedLine = renderLine(variantDensity)

  return (
    <div className={css.track}>
      <VariantAxis
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={'Variants/bp'}
        trackYScale={densityYScale}
      />
      <svg
        width={width}
        height={height}
      >
      {renderedLine}
    </svg>
  </div>
  )
}

export default connect(state => ({
  variants: searchFilteredVariants(state),
}))(VariantDensityTrack)
