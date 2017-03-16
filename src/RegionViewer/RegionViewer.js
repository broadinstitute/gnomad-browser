import React, { PropTypes, Component } from 'react'
import {
  calculateOffsetRegions,
  calculatePositionOffset,
  calculateXScale,
} from 'utilities/calculateOffsets'  // eslint-disable-line

class RegionViewer extends Component {

  static propTypes = {
    children: PropTypes.object.isRequired,
    css: PropTypes.object.isRequired,
    regions: PropTypes.array.isRequired,
  }

  state = {
    width: 800,
    leftPanelWidth: 50,
    rightPanelWidth: 50,
    featuresToDisplay: ['CDS'],
    padding: 50,
    ready: false,
  }

  updatePlotSettings = () => {
    const { featuresToDisplay, padding, width } = this.state
    const { regions } = this.props
    const offsetRegions = calculateOffsetRegions(featuresToDisplay, padding, regions)
    const positionOffset = calculatePositionOffset(offsetRegions)
    const xScale = calculateXScale(width, offsetRegions)
    this.setState({
      offsetRegions,
      positionOffset,
      xScale,
      ready: true,
    })
  }

  expand = () => this.setState({ width: 800 })

  contract = () => this.setState({ width: 400 })

  zoom = () => {
    const { width } = this.state
    if (width === 800) {
      this.contract()
    } else {
      this.expand()
    }
  }

  renderChildren = (childProps) => {
    return React.Children.map(this.props.children, (child) => {
      return React.cloneElement(child, childProps)
    })
  }

  render() {
    const { css } = this.props
    const { featuresToDisplay, padding, width, leftPanelWidth } = this.state
    const { regions } = this.props
    const offsetRegions = calculateOffsetRegions(featuresToDisplay, padding, regions)
    const positionOffset = calculatePositionOffset(offsetRegions)
    const xScale = calculateXScale(width, offsetRegions)
    const childProps = {
      leftPanelWidth,
      positionOffset,
      xScale,
      width,
    }
    return (
      <div className={css.regionViewer}>
        <div style={{ width: width + leftPanelWidth }} className={css.regionArea}>
          {this.renderChildren(childProps)}
        </div>
        <button
          className={css.button}
          onClick={() =>
            this.zoom()
          }
        >
          Expand!!!
        </button>
      </div>
    )
  }
}
export default RegionViewer
