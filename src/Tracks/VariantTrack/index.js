/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'

import css from './styles.css'

const Axis = ({ height, title, width }) => {
  return <div className={css.yLabel}>{title}</div>
}
Axis.propTypes = {
  height: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  width: PropTypes.number.isRequired,
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

const VariantData = ({
  width,
  height,
  variants,
  xScale,
  positionOffset,
  color,
  circleRadius,
  circleStroke,
  circleStrokeWidth,
}) => {
  const yPad = 3
  const max = height - yPad
  const min = yPad
  return (
    <svg
      width={width}
      height={height}
    >
      {variants.map((variant, i) => {
        const yPosition = Math.floor((Math.random() * (max - min)) + min)
        const calc = positionOffset(variant.pos)
        if (calc === 0) {
          return  // eslint-disable-line
        }
        return ( // eslint-disable-line
          <circle
            className={css.point}
            cx={xScale(calc.offsetPosition)}
            cy={yPosition}
            r={circleRadius || 2}
            fill={color || calc.color}
            strokeWidth={circleStrokeWidth || 0}
            stroke={circleStroke || 0}
            key={`${i}-point`}
          />
          )
      })}
    </svg>
  )
}

const VariantTrack = ({
  width,
  height,
  leftPanelWidth,
  variants,
  xScale,
  positionOffset,
  title,
  color,
  circleRadius,
  circleStroke,
  circleStrokeWidth,
}) => {
  return (
    <div className={css.track}>
      <VariantAxis
        height={height}
        leftPanelWidth={leftPanelWidth}
        title={title}
      />
      <div className={css.data}>
        <VariantData
          width={width}
          height={height}
          variants={variants}
          positionOffset={positionOffset}
          xScale={xScale}
          color={color}
          circleRadius={circleRadius}
          circleStroke={circleStroke}
          circleStrokeWidth={circleStrokeWidth}
        />
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
  circleRadius: PropTypes.number,
  circleStroke: PropTypes.string,
  circleStrokeWidth: PropTypes.number,
}

export default VariantTrack
