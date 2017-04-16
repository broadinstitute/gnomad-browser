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
}) => {
  return (
    <svg
      width={width}
      height={height}
    >
      {variants.map((variant, i) => {
        const calc = positionOffset(variant.pos)
        if (calc === 0) {
          return  // eslint-disable-line
        }
        return ( // eslint-disable-line
          <circle
            className={css.point}
            cx={xScale(calc.offsetPosition)}
            cy={Math.floor(Math.random() * height)}
            r={1}
            fill={calc.color}
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
}

export default VariantTrack
