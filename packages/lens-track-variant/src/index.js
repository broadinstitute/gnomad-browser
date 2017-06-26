/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import { scaleLog } from 'd3-scale'

import defaultStyles from './styles.css'

const Axis = ({ title, css }) => {
  return <div className={css.yLabel}>{title}</div>
}
Axis.propTypes = {
  title: PropTypes.string.isRequired,
}

const VariantAxis = ({ title, leftPanelWidth, css }) => {
  return (
    <div
      style={{ width: leftPanelWidth }}
      className={css.variantLeftAxis}
    >
      <div className={css.variantAxisName} style={{ fontSize: 12 }}>
        {title}
      </div>
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

const setYPosition = (height, ySetting) => {
  const yPad = 10
  const max = height - yPad
  const min = yPad
  switch (ySetting) {
    case 'random':
      return Math.floor((Math.random() * (max - min)) + min)
    case 'center':
      return Math.floor((max + min) / 2)
    default:
      return Math.floor((Math.random() * (max - min)) + min)
  }
}

const lofColors = {
  HC: '#FF583F',
  LC: '#F0C94D',
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
  return (
    <div className={css.track}>
      <VariantAxis
        css={css}
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={title}
      />
      <div className={css.data}>
        <svg
          width={width}
          height={height}
        >
          {variants.map((variant, index) => {
            const { markerType,
              yPositionSetting,
              fillColor,
              afMax,
            } = markerConfig
            const yPosition = setYPosition(height, yPositionSetting)
            const regionViewerAttributes = positionOffset(variant.pos)
            console.log(positionOffset(variant.pos))
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
