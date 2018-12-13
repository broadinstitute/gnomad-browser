import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  invertPositionOffset,
  calculateXScale,
} from './coordinates'

const RegionViewerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: ${props => props.width}px;
  margin: 0 auto 10px;
  font-size: 12px;
`

const exonColor = '#212121'
const paddingColor = '#BDBDBD'
const masterExonThickness = '25px'
const masterPaddingThickness = '5px'

const defaultRegionAttributes = {
  CDS: {
    color: exonColor,
    thickness: masterExonThickness,
  },
  start_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  end_pad: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  intron: {
    color: paddingColor,
    thickness: masterPaddingThickness,
  },
  default: {
    color: 'grey',
    thickness: masterPaddingThickness,
  },
}

export class RegionViewer extends Component {
  static propTypes = {
    children: PropTypes.node,
    featuresToDisplay: PropTypes.arrayOf(PropTypes.string),
    leftPanelWidth: PropTypes.number,
    padding: PropTypes.number.isRequired,
    regionAttributes: PropTypes.objectOf(
      PropTypes.shape({
        color: PropTypes.string.isRequired,
        thickness: PropTypes.string.isRequired,
      })
    ),
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

  static defaultProps = {
    children: undefined,
    featuresToDisplay: ['CDS'],
    leftPanelWidth: 100,
    regionAttributes: defaultRegionAttributes,
    rightPanelWidth: 160,
  }

  renderChildren(childProps) {
    const { children } = this.props
    return React.Children.map(
      children,
      child => (child ? React.cloneElement(child, childProps) : null)
    )
  }

  render() {
    const {
      featuresToDisplay,
      regions,
      regionAttributes,
      width,
      padding,
      leftPanelWidth,
      rightPanelWidth,
    } = this.props

    const offsetRegions = calculateOffsetRegions(
      featuresToDisplay,
      regionAttributes,
      padding,
      regions
    )

    const positionOffset = calculatePositionOffset(offsetRegions)
    const xScale = calculateXScale(width, offsetRegions)
    const invertOffset = invertPositionOffset(offsetRegions, xScale)

    const childProps = {
      leftPanelWidth,
      positionOffset,
      invertOffset,
      xScale,
      width,
      offsetRegions,
      rightPanelWidth,
    }

    return (
      <RegionViewerWrapper width={width + leftPanelWidth + rightPanelWidth}>
        {this.renderChildren(childProps)}
      </RegionViewerWrapper>
    )
  }
}
