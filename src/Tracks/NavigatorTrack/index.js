/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import ReactCursorPosition from 'react-cursor-position'
import R from 'ramda'

import css from './styles.css'

const NavigatorAxis = ({ title, height, leftPanelWidth }) => {
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

// const PositionLabel = (
//   { position: { x, y } = 0,
//   isActive,
//   isPositionOutside },
//   onNavigatorClick,
// ) => {
//   return (
//     <div
//       className={css.positionLabel}
//       onClick={e => onNavigatorClick({ x, y })}
//     >
//       {`x: ${x}`}<br />
//       {`y: ${y}`}<br />
//       {`isActive: ${isActive}`}<br />
//       {`isOutside: ${isPositionOutside ? 'true' : 'false'}`}
//     </div>
//   )
// }

const ClickArea = ({
  height,
  width,
  invertOffset,
  xScale,
  position,
  isActive,
  isPositionOutside,
  onNavigatorClick,
  positionsWithData,
}) => {
  return (
    <svg
      className={css.areaClick}
      width={width}
      height={height}
      onClick={e => onNavigatorClick(invertOffset(position.x))}
    >
      <rect
        className={css.navigatorRect}
        x={0}
        y={0}
        width={width}
        height={height}
      />
      <rect
        className={css.positionWindowRect}
        x={position.x - 15}
        y={0}
        width={30}
        height={height}
      />
    </svg>
  )
}

const NavigatorTrack = (props) => {
  return (
    <div className={css.track}>
      <NavigatorAxis
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

export default NavigatorTrack
