import React, { PropTypes, Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'
import Slider from 'material-ui/Slider'

import {
  calculateOffsetRegions,
  calculatePositionOffset,
  calculateXScale,
} from 'utilities/calculateOffsets'  // eslint-disable-line

injectTapEventPlugin()

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

  setWidth = (event, newValue) => {
    const newWidth = 800 * newValue
    this.setState({ width: newWidth })
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
        <p>Zoom!</p>
        <Slider
          style={{
            width: 400,
          }}
          onChange={this.setWidth}
        />
        <div style={{ width: width + leftPanelWidth }} className={css.regionArea}>
          {this.renderChildren(childProps)}
        </div>
      </div>
    )
  }
}
export default RegionViewer
