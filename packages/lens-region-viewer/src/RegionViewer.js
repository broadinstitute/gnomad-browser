import React, { PropTypes, Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  invertPositionOffset,
  calculateXScale,
} from '@lens/utils-genomic-coordinates'  // eslint-disable-line

import defaultStyles from './styles.css'

injectTapEventPlugin()

const {
  exonColor,
  paddingColor,
  masterExonThickness,
  masterPaddingThickness,
} = defaultStyles

class RegionViewer extends Component {

  static propTypes = {
    css: PropTypes.object,
    regions: PropTypes.array.isRequired,
    regionAttributes: PropTypes.object,
    padding: PropTypes.number.isRequired,
    exonSubset: PropTypes.array,
    onRegionClick: PropTypes.func,
  }

  static defaultProps = {
    css: defaultStyles,
    exonSubset: null,
    onRegionClick: () => {},
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
    leftPanelWidth: 100,
    rightPanelWidth: 50,
    featuresToDisplay: ['CDS'],
    ready: false,
  }

  setWidth = (event, newValue) => {
    const newWidth = 800 * newValue
    this.setState({ width: newWidth })
  }

  setLeftPanelWidth = (event, newValue) => {
    const leftPanelWidth = Math.floor(400 * newValue)
    this.setState({ leftPanelWidth })
  }

  renderChildren = (childProps) => {
    return React.Children.map(this.props.children, (child) => {
      if (child) {
        return React.cloneElement(child, childProps)
      }
    })
  }

  render() {
    const { css } = this.props
    const { featuresToDisplay, leftPanelWidth } = this.state
    const {
      regions,
      regionAttributes,
      width,
      exonSubset,
      padding,
    } = this.props

    const offsetRegions = calculateOffsetRegions(
      featuresToDisplay,
      regionAttributes,
      padding,
      regions,
      exonSubset,
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
      regionAttributes,
      padding,
    }

    return (
      <div className={css.regionViewer}>
        {/*<p>Exon padding {padding.toPrecision(3)} bp</p>*/}
        <div style={{ width: width + leftPanelWidth }} className={css.regionArea}>
          {this.renderChildren(childProps)}
        </div>
      </div>
    )
  }
}
export default RegionViewer
