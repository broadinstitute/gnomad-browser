/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import ReactCursorPosition from 'react-cursor-position'
// import R from 'ramda'

import defaultStyles from './styles.css'

const NavigatorAxis = ({ css, title, height, leftPanelWidth }) => {
  return (
    <div
      style={{ width: leftPanelWidth }}
      className={css.loadingLeftAxis}
    >
      <div
        className={css.loadingAxisName}
        style={{
          height,
          fontSize: 12,
        }}
      >
        {title}
      </div>
    </div>
  )
}
NavigatorAxis.propTypes = {
  leftPanelWidth: PropTypes.number.isRequired,
}

const ClickArea = ({
  css,
  height,
  width,
  positionOffset,
  invertOffset,
  xScale,
  position, // active mouse position from ReactCursorPosition
  scrollSync, // position in from table
  onNavigatorClick,
}) => {
  const tablePosition = xScale(
    positionOffset(scrollSync).offsetPosition,
  )

  return (
    <svg
      className={css.areaClick}
      width={width}
      height={height}
      onClick={_ => onNavigatorClick(invertOffset(position.x))}
    >
      <rect
        className={css.navigatorContainerRect}
        x={0}
        y={0}
        width={width}
        height={height}
      />
      <rect
        className={css.cursorPositionRect}
        x={position.x - 15}
        y={0}
        width={30}
        height={height}
      />
      <rect
        className={css.tablePositionRect}
        x={tablePosition - 15}
        y={0}
        width={30}
        height={height}
      />
    </svg>
  )
}

const NavigatorTrack = (props) => {
  const { css } = props
  return (
    <div className={css.track}>
      <NavigatorAxis
        css={css}
        title={props.title}
        height={props.height}
        leftPanelWidth={props.leftPanelWidth}
      />
      <ReactCursorPosition className={css.cursorPosition}>
        <ClickArea {...props} />
      </ReactCursorPosition>
    </div>
  )
}
NavigatorTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number,  // eslint-disable-line
}
NavigatorTrack.defaultProps = {
  css: defaultStyles,
}

export default NavigatorTrack
