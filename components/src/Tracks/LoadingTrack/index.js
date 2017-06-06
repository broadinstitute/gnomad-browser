/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'

import css from './styles.css'

const Axis = ({ height, title, width }) => {
  return <div className={css.yLabel}>{title}</div>
}
Axis.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number.isRequired,
}

const LoadingAxis = ({ title, leftPanelWidth }) => {
  return (
    <div
      style={{ width: leftPanelWidth }}
      className={css.loadingLeftAxis}
    >
      <div className={css.loadingAxisName} style={{ fontSize: 12 }}>
        {title}
      </div>
    </div>
  )
}
LoadingAxis.propTypes = {
  leftPanelWidth: PropTypes.number.isRequired,
}

const LoadingTrack = ({
  width,
  height,
  leftPanelWidth,
}) => {
  return (
    <div className={css.track}>
      <LoadingAxis
        height={height}
        leftPanelWidth={leftPanelWidth}
      />
      <div className={css.data}>
        Loading
      </div>
    </div>
  )
}
LoadingTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number,  // eslint-disable-line
}

export default LoadingTrack
