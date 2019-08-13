import PropTypes from 'prop-types'
import React from 'react'
import ReactCursorPosition from 'react-cursor-position'
import styled from 'styled-components'

import { RegionViewerContext } from '@broad/region-viewer'

const CursorOverlayWrapper = styled.svg`
  position: absolute;
  top: 0;
  height: 100%;
  pointer-events: none;
`

const CursorOverlay = ({
  centerPanelWidth,
  children,
  cursorPosition,
  leftPanelWidth,
  onClick,
  ...otherProps
}) => (
  // To allow interaction with child tracks behind the overlaid SVG, the SVG element is styled with `pointer-events: none`.
  // This also makes it unclickable, so the click handler is placed on the parent element (which wraps the entire child
  // track(s)). Consumers are only notified if a click occurs within the center panel of the child track(s).

  // TODO: Make this focusable? Arrow keys to move cursor?
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
  <div
    style={{ position: 'relative' }}
    onClick={() => {
      if (cursorPosition) {
        onClick(cursorPosition)
      }
    }}
  >
    <CursorOverlayWrapper
      {...otherProps}
      style={{ ...otherProps.style, left: `${leftPanelWidth}px`, width: `${centerPanelWidth}px` }}
    >
      {cursorPosition && (
        <rect
          x={cursorPosition - 15}
          y={0}
          width={30}
          height="100%"
          fill="none"
          stroke="black"
          strokeDasharray="5, 5"
          strokeWidth={1}
          style={{ cursor: 'pointer' }}
        />
      )}
    </CursorOverlayWrapper>
    {children}
  </div>
)

CursorOverlay.propTypes = {
  centerPanelWidth: PropTypes.number.isRequired,
  children: PropTypes.node,
  cursorPosition: PropTypes.number,
  leftPanelWidth: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
}

CursorOverlay.defaultProps = {
  children: undefined,
  cursorPosition: undefined,
}

export const Cursor = ({ children, onClick, ...otherProps }) => (
  <RegionViewerContext.Consumer>
    {({ centerPanelWidth, leftPanelWidth, scalePosition }) => (
      <ReactCursorPosition
        mapChildProps={({ isPositionOutside, position }) => ({
          cursorPosition:
            isPositionOutside ||
            position.x < leftPanelWidth ||
            position.x > leftPanelWidth + centerPanelWidth
              ? undefined
              : position.x - leftPanelWidth,
        })}
      >
        <CursorOverlay
          {...otherProps}
          centerPanelWidth={centerPanelWidth}
          leftPanelWidth={leftPanelWidth}
          onClick={cursorPosition => {
            onClick(scalePosition.invert(cursorPosition))
          }}
        >
          {children}
        </CursorOverlay>
      </ReactCursorPosition>
    )}
  </RegionViewerContext.Consumer>
)

Cursor.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func.isRequired,
}

Cursor.defaultProps = {
  children: undefined,
}
