/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import R from 'ramda'
import { scaleLinear, scaleLog } from 'd3-scale'
import { max, min, range } from 'd3-array'

import defaultStyles from './styles.css'

const yPad = 10

const Axis = ({ title, css }) => {
  return <div className={css.yLabel}>{title}</div>
}
Axis.propTypes = {
  title: PropTypes.string.isRequired,
}

const VariantAxis = ({ title, height, leftPanelWidth, trackYScale, css }) => {
  const YTicks = trackYScale ? () => {
    return (
        <g>
          {trackYScale.ticks().map(t => {
            return (
              <g key={t}>
                <line
                  x1={leftPanelWidth - 10}
                  x2={leftPanelWidth - 5}
                  y1={trackYScale(t)}
                  y2={trackYScale(t)}
                  stroke={'black'}
                />
                <text
                  className={css.yTickText}
                  x={leftPanelWidth - 30}
                  y={trackYScale(t) + 5}
                >
                  {t}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
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
        <YTicks />
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

const VariantAlleleFrequency = ({
  css,
  xScale,
  offsetPosition,
  yPosition,
  color,
  // circleRadius,
  circleStroke,
  circleStrokeWidth,
  variant,
  afScale,
}) => {
  if (variant.allele_freq === 0) {
    return (
      <circle
        className={css.point}
        cx={xScale(offsetPosition)}
        cy={yPosition}
        r={1}
        fill={'white'}
        strokeWidth={circleStrokeWidth || 0}
        stroke={circleStroke || 0}
      />
    )
  }
  return (
    <circle
      className={css.point}
      cx={xScale(offsetPosition)}
      cy={yPosition}
      r={afScale(variant.allele_freq)}
      fill={color}
      strokeWidth={circleStrokeWidth || 0}
      stroke={circleStroke || 0}
    />
  )
}

const VariantCircle = ({
  css,
  xScale,
  offsetPosition,
  yPosition,
  color,
  circleRadius,
  circleStroke,
  circleStrokeWidth,
}) => {
  return (
    <circle
      className={css.point}
      cx={xScale(offsetPosition)}
      cy={yPosition}
      r={circleRadius || 2}
      fill={color}
      strokeWidth={circleStrokeWidth || 0}
      stroke={circleStroke || 0}
    />
  )
}

const VariantTick = ({
  css,
  xScale,
  offsetPosition,
  yPosition,
  color,
  tickHeight,
  tickWidth,
  tickStroke,
  tickStrokeWidth,
}) => {
  return (
    <rect
      className={css.rect}
      x={xScale(offsetPosition)}
      y={yPosition}
      width={tickWidth}
      height={tickHeight * 2}
      fill={color}
      strokeWidth={tickStrokeWidth || 0}
      stroke={tickStroke || 0}
    />
  )
}

const getVariantMarker = ({ markerType, markerKey, ...rest }) => {
  switch (markerType) {
    case 'af':
      return <VariantAlleleFrequency key={markerKey} {...rest} />
    case 'circle':
      return <VariantCircle key={markerKey} {...rest} />
    case 'tick':
      return <VariantTick key={markerKey} {...rest} />
    default:
      return <VariantCircle key={markerKey} {...rest} />
  }
}

const setYPosition = (height, ySetting, markerConfig, variant, trackYScale) => {
  const maxHeight = height - yPad
  const minHeight = yPad
  switch (ySetting) {
    case 'random':
      return Math.floor((Math.random() * (maxHeight - minHeight)) + minHeight)
    case 'center':
      return Math.floor((maxHeight + minHeight) / 2)
    case 'attribute':
      return trackYScale(variant[markerConfig.yPositionAttribute])
    default:
      return Math.floor((Math.random() * (maxHeight - minHeight)) + minHeight)
  }
}

const lofColors = {
  HC: '#FF583F',
  LC: '#F0C94D',
}

function getTrackYScale (markerConfig, variants, height) {
  const yData = R.pluck(markerConfig.yPositionAttribute, variants)
  const yScale = scaleLinear()
    .domain([min(yData), max(yData) + (max(yData) * 0.1)])
    .range([height - yPad, yPad])
  return yScale
}

const VariantTrack = ({
  css,
  title,
  width,
  height,
  leftPanelWidth,
  variants,
  positionOffset,
  markerConfig,
  color,
  ...rest
}) => {
  const trackYScale = markerConfig.yPositionSetting === 'attribute' ?
    getTrackYScale(markerConfig, variants, height) : null
  const localTitle = markerConfig.yPositionSetting === 'attribute' ?
    markerConfig.yPositionAttribute : title
  return (
    <div className={css.track}>
      <VariantAxis
        css={css}
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={localTitle}
        trackYScale={trackYScale}
      />
      <div className={css.data}>
        <svg
          width={width}
          height={height}
        >
          {variants.map((variant, index) => {
            const {
              markerType,
              yPositionSetting,
              fillColor,
              afMax,
            } = markerConfig
            const yPosition = setYPosition(height, yPositionSetting, markerConfig, variant, trackYScale)
            const regionViewerAttributes = positionOffset(variant.pos)
            const markerKey = `${title.replace(' ', '_')}-${index}-${markerType}`
            const localColor = fillColor === 'lof' ? lofColors[variant.first_lof_flag] : '#757575'
            if (regionViewerAttributes === 0) return  // eslint-disable-line
            const afScale =
              scaleLog()
                .domain([
                  0.00000660,
                  afMax,
                ])
                .range([3, 6])
            const childProps = {
              css,
              index,
              ...regionViewerAttributes,
              ...rest,
              ...markerConfig,
              color: localColor,
              markerKey,
              yPosition,
              variant,
              afScale,
            }
            return getVariantMarker(childProps)
          })}
        </svg>
      </div>
    </div>
  )
}
VariantTrack.propTypes = {
  css: PropTypes.object,
  title: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  variants: PropTypes.array.isRequired,
  width: PropTypes.number,  // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  xScale: PropTypes.func,  // eslint-disable-line
  color: PropTypes.string,
  markerConfig: PropTypes.object,
  activeVariant: PropTypes.string,
}
VariantTrack.defaultProps = {
  css: defaultStyles,
  color: 'grey',
  markerConfig: {
    markerType: 'circle',
    radius: 3,
    stroke: 'black',
    strokeWidth: 1,
    yPositionSetting: 'random',
    fillColor: null,
  },
}

export default VariantTrack
