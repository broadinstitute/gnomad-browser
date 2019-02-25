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
  const offsetRegions = calculateOffsetRegions(padding, regions)

  const positionOffset = calculatePositionOffset(offsetRegions)
  const xScale = calculateXScale(width, offsetRegions)
  const invertOffset = invertPositionOffset(offsetRegions, xScale)

  const scalePosition = pos => xScale(positionOffset(pos).offsetPosition)
  scalePosition.invert = invertOffset

  const childProps = {
    leftPanelWidth,
    offsetRegions, // used only by track-coverage and track-position-table
    positionOffset,
    rightPanelWidth,
    scalePosition,
    width,
  }

  return (
    <RegionViewerWrapper width={width + leftPanelWidth + rightPanelWidth}>
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
