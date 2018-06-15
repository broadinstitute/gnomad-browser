import React, { Component } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  invertPositionOffset,
  calculateXScale,
} from '@broad/utilities/src/coordinates'  // eslint-disable-line

const RegionViewerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 auto 10px;
  width: ${props => props.width}px;
`

const exonColor = '#212121'
const paddingColor = '#BDBDBD'
const masterExonThickness = '25px'
const masterPaddingThickness = '5px'

class RegionViewer extends Component {
  static propTypes = {
    regions: PropTypes.array.isRequired,
    regionAttributes: PropTypes.object,
    padding: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    leftPanelWidth: PropTypes.number.isRequired,
    rightPanelWidth: PropTypes.number.isRequired,
    exonSubset: PropTypes.array,
    broadcast: PropTypes.func,
    featuresToDisplay: PropTypes.array,
  }

  static defaultProps = {
    exonSubset: null,
    leftPanelWidth: 100,
    rightPanelWidth: 150,
    onRegionClick: () => {},
    broadcast: () => {},
    featuresToDisplay: ['CDS'],
    regionAttributes: {
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
    },
  }

  state = {
    rightPanelWidth: 150,
    ready: false,
  }

  // componentWillMount () {
  //   this.broadcastOffsetRegions()
  // }
  //
  // componentDidUpdate () {
  //   this.broadcastOffsetRegions()
  // }

  setWidth = (event, newValue) => {
    const newWidth = 800 * newValue
    this.setState({ width: newWidth })
  }

  setLeftPanelWidth = (event, newValue) => {
    const leftPanelWidth = Math.floor(400 * newValue)
    this.setState({ leftPanelWidth })
  }

  broadcastOffsetRegions = () => {
    if (this.props.regions) {
      const offsetRegions = calculateOffsetRegions(
        this.props.featuresToDisplay,
        this.props.regionAttributes,
        this.props.padding,
        this.props.regions,
        this.props.exonSubset
      )
      this.props.broadcast({ offsetRegions })
    }
  }

  renderChildren = (childProps) => {
    // eslint-disable-next-line
    return React.Children.map(this.props.children, (child) => {
      if (child) {
        return React.cloneElement(child, childProps)
      }
    })
  }

  render() {
    const { featuresToDisplay } = this.props
    const {
      regions,
      regionAttributes,
      width,
      exonSubset,
      padding,
      leftPanelWidth,
      rightPanelWidth,
    } = this.props

    const offsetRegions = calculateOffsetRegions(
      featuresToDisplay,
      regionAttributes,
      padding,
      regions,
      exonSubset
    )

    const positionOffset = calculatePositionOffset(offsetRegions)
    const xScale = calculateXScale(width, offsetRegions)
    const xScaleBand = calculateXScale(width, offsetRegions, 0.2)
    const invertOffset = invertPositionOffset(offsetRegions, xScale)

    const childProps = {
      leftPanelWidth,
      positionOffset,
      invertOffset,
      xScale,
      width,
      offsetRegions,
      regionAttributes,
      padding,
      xScaleBand,
      rightPanelWidth,
    }

    return (
      <RegionViewerWrapper width={width + leftPanelWidth + rightPanelWidth}>
        {this.renderChildren(childProps)}
      </RegionViewerWrapper>
    )
  }
}
export default RegionViewer
