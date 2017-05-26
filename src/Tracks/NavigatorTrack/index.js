/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import ReactCursorPosition from 'react-cursor-position'
import { range } from 'd3-array'
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
  isPositionOutside, // from ReactCursorPosition
  scrollSync, // position in from table
  onNavigatorClick,
}) => {
  const tablePosition = xScale(positionOffset(scrollSync).offsetPosition)
  const navigatorBoxPadding = 5

  const PositionMarks = () => {
    const tickHeight = 2
    const numberOfTicks = 10
    const textRotationDegrees = 0
    const textXOffsetFromTick = 0
    const textYOffsetFromTick = 5
    const tickPositions = range(0, width, width / numberOfTicks)
    const tickGenomePositions = tickPositions.map(t => ({ x: t, label: invertOffset(t) }))

    const tickDrawing = (x, genomePositionLabel) => (
      <g key={`tick-${x}-axis`}>
        <line
          className={css.xTickLine}
          x1={x}
          x2={x}
          y1={height}
          y2={height - tickHeight}
          stroke={'black'}
          strokeWidth={1}
        />
        <text
          className={css.xTickText}
          x={x + textXOffsetFromTick}
          y={height - textYOffsetFromTick}
          transform={`rotate(${360 - textRotationDegrees} ${x} ${height})`}
        >
          {genomePositionLabel}
        </text>
      </g>
    )

    const axisTicksDrawing = tickGenomePositions.map(({ x, label }) => tickDrawing(x, label))

    return (
      <g>
        <line
          className={css.xAxisLine}
          x1={0}
          x2={width}
          y1={height}
          y2={height}
          stroke={'black'}
          strokeWidth={1}
          key={'position-x-axis'}
        />
        {axisTicksDrawing}
      </g>
    )
  }

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
        className={css.tablePositionRect}
        x={tablePosition - 15}
        y={0}
        width={30}
        height={height - navigatorBoxPadding}
      />
      {!isPositionOutside &&
      <rect
        className={css.cursorPositionRect}
        x={position.x - 15}
        y={0}
        width={30}
        height={height - navigatorBoxPadding}
      />}
      <PositionMarks />
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
