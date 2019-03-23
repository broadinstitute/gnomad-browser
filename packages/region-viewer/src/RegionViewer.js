import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  invertPositionOffset,
  calculateXScale,
} from './coordinates'

export const RegionViewerContext = React.createContext()

const RegionViewerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: ${props => props.width}px;
  margin: 0 auto 10px;
  font-size: 12px;
`

export const RegionViewer = ({
  children,
  leftPanelWidth,
  padding,
  regions,
  rightPanelWidth,
  width,
}) => {
  const centerPanelWidth = width - (leftPanelWidth + rightPanelWidth)
  const offsetRegions = calculateOffsetRegions(padding, regions)

  const positionOffset = calculatePositionOffset(offsetRegions)
  const xScale = calculateXScale(centerPanelWidth, offsetRegions)
  const invertOffset = invertPositionOffset(offsetRegions, xScale)

  const scalePosition = pos => xScale(positionOffset(pos).offsetPosition)
  scalePosition.invert = invertOffset

  const isPositionDefined = pos =>
    offsetRegions.some(region => region.start <= pos && pos <= region.stop)

  const childProps = {
    centerPanelWidth,
    isPositionDefined,
    leftPanelWidth,
    offsetRegions, // used only by track-coverage and track-position-table
    positionOffset,
    rightPanelWidth,
    scalePosition,
  }

  return (
    <RegionViewerWrapper width={width}>
      <RegionViewerContext.Provider value={childProps}>{children}</RegionViewerContext.Provider>
    </RegionViewerWrapper>
  )
}

RegionViewer.propTypes = {
  children: PropTypes.node,
  leftPanelWidth: PropTypes.number,
  padding: PropTypes.number.isRequired,
  regions: PropTypes.arrayOf(
    PropTypes.shape({
      feature_type: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    })
  ).isRequired,
  rightPanelWidth: PropTypes.number,
  width: PropTypes.number.isRequired,
}

RegionViewer.defaultProps = {
  children: undefined,
  leftPanelWidth: 100,
  rightPanelWidth: 160,
}
