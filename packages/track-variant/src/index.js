/* eslint-disable react/prop-types */
import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import R from 'ramda'
import { scaleLinear, scaleLog } from 'd3-scale'
import { max, min } from 'd3-array'

const yPad = 10

const Axis = ({ title }) => {
  return <div>{title}</div>
}
Axis.propTypes = {
  title: PropTypes.string.isRequired,
}

const VariantAxis = ({ title, height, leftPanelWidth, trackYScale }) => {
  const YTicks = trackYScale ? () => {
    return (
      <g>
        {trackYScale.ticks().map((t) => {
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
      <YAxis />
      {/*<div style={{ fontSize: 12 }}>
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
    // TODO add back hover effect
    return (
      <circle
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

  const VariantTrackContainer = styled.div`
    display: flex;
    align-items: center;
    margin-top: 5px;
  `



  return (
    <VariantTrackContainer>
      <VariantAxis
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={localTitle}
        trackYScale={trackYScale}
      />
      <div>
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

            const yPosition = setYPosition(
              height,
              yPositionSetting,
              markerConfig,
              variant,
              trackYScale
            )

            const regionViewerAttributes = positionOffset(variant.pos)
            const markerKey = `${title.replace(' ', '_')}-${index}-${markerType}`
            const localColor = fillColor === 'lof' ? lofColors[variant.first_lof_flag] : '#757575'

            // if (regionViewerAttributes === 0) return  // TODO: what is this for
            const afScale =
              scaleLog()
                .domain([
                  0.00000660,
                  afMax,
                ])
                .range([3, 6])

            const childProps = {
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
    </VariantTrackContainer>
  )
}
VariantTrack.propTypes = {
  title: PropTypes.string.isRequired,
  height: PropTypes.number.isRequired,
  variants: PropTypes.any.isRequired,
  width: PropTypes.number,  // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  xScale: PropTypes.func,  // eslint-disable-line
  color: PropTypes.string,
  markerConfig: PropTypes.object,
}
VariantTrack.defaultProps = {
  title: '',
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
