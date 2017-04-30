/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'

import css from './styles.css'

const Axis = ({ title }) => {
  return <div className={css.yLabel}>{title}</div>
}
Axis.propTypes = {
  title: PropTypes.string.isRequired,
}

const VariantAxis = ({ title, leftPanelWidth }) => {
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

const VariantCircle = ({
  index,
  xScale,
  offsetPosition,
  yPosition,
  color,
  markerRadius,
  markerStroke,
  markerStrokeWidth,
}) => {
  return (
    <circle
      className={css.point}
      cx={xScale(offsetPosition)}
      cy={yPosition}
      r={markerRadius || 2}
      fill={color}
      strokeWidth={markerStrokeWidth || 0}
      stroke={markerStroke || 0}
    />
  )
}

const VariantTick = ({
  index,
  xScale,
  offsetPosition,
  yPosition,
  color,
  markerRadius,
  markerStroke,
  markerStrokeWidth,
}) => {
  return (
    <rect
      className={css.rect}
      x={xScale(offsetPosition)}
      y={yPosition}
      width={markerRadius}
      height={markerRadius * 2}
      fill={color}
      strokeWidth={markerStrokeWidth || 0}
      stroke={markerStroke || 0}
    />
  )
}

const getVariantMarker = (props) => {
  const { markerType, markerKey, ...rest } = props
  switch (markerType) {
    case 'circle':
      return <VariantCircle key={markerKey} {...rest} />
    case 'tick':
      return <VariantTick key={markerKey} {...rest} />
    default:
      return <VariantTick key={markerKey} {...rest} />
  }
}

const setYPosition = (height, ySetting) => {
  const yPad = 3
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

const VariantTrack = ({
  title,
  width,
  height,
  leftPanelWidth,
  variants,
  positionOffset,
  markerType,
  yPositionSetting,
  ...rest
}) => {
  return (
    <div className={css.track}>
      <VariantAxis
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
            const yPosition = setYPosition(height, yPositionSetting)
            const regionViewerAttributes = positionOffset(variant.pos)
            const markerKey = `${title.replace(' ', '_')}-${index}-${markerType}`
            if (regionViewerAttributes === 0) {
              return  // eslint-disable-line
            }
            const childProps = {
              index,
              ...regionViewerAttributes,
              ...rest,
              markerType,
              markerKey,
              yPosition,
            }
            return getVariantMarker(childProps)
          })}
        </svg>
      </div>
    </div>
  )
}
VariantTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number,  // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  xScale: PropTypes.func,  // eslint-disable-line
  variants: PropTypes.array.isRequired,
  title: PropTypes.string.isRequired,
  color: PropTypes.string,
  markerType: PropTypes.string,
  markerRadius: PropTypes.number,
  markerStroke: PropTypes.string,
  markerStrokeWidth: PropTypes.number,
}
VariantTrack.defaultProps = {
  markerType: 'circle',
  yPositionSetting: 'random',
}

export default VariantTrack
