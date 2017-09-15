import React, { PropTypes, Component } from 'react'
// import injectTapEventPlugin from 'react-tap-event-plugin'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  invertPositionOffset,
  calculateXScale,
} from '@broad/utilities/lib/coordinates'  // eslint-disable-line

import defaultStyles from './styles.css'

// injectTapEventPlugin()

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
    broadcast: PropTypes.func,
  }

  static defaultProps = {
    css: defaultStyles,
    exonSubset: null,
    leftPanelWidth: 100,
    onRegionClick: () => {},
    broadcast: () => {},
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
    rightPanelWidth: 50,
    featuresToDisplay: ['CDS'],
    ready: false,
  }

  componentWillMount () {
    this.broadcastOffsetRegions()
  }

  componentDidUpdate () {
    this.broadcastOffsetRegions()
  }

  broadcastOffsetRegions = () => {
    if (this.props.regions) {
      const offsetRegions = calculateOffsetRegions(
        this.state.featuresToDisplay,
        this.props.regionAttributes,
        this.props.padding,
        this.props.regions,
        this.props.exonSubset,
      )
      this.props.broadcast({ offsetRegions })
    }
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

  broadcast(offsetRegions) {
    console.log()
  }

  render() {
    const { featuresToDisplay } = this.state
    const {
      regions,
      regionAttributes,
      width,
      exonSubset,
      padding,
      css,
      leftPanelWidth,
      broadcast,
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
