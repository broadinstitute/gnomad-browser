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
          <rect
            className={css.rectangle}
            x={xScale(calc.offsetPosition)}
            y={Math.floor(Math.random() * height)}
            width={3}
            height={3}
            fill={calc.color}
            stroke={calc.color}
            key={`${i}-rectangle`}
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
      <div className={css.yAxis}>
        <Axis
          height={height}
          width={leftPanelWidth}
          title={title}
        />
      </div>
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
