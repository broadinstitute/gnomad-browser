import React, { PropTypes, Component } from 'react'

class RegionViewer extends Component {
  static propTypes = {
    children: PropTypes.array.isRequired,
    css: PropTypes.object.isRequired,
    width: PropTypes.number.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }

  state = {
    width: this.props.width,
    featuresToDisplay: ['CDS'],
  }

  expand = () => this.setState({ width: 1000 })

  contract = () => this.setState({ width: 400 })

  zoom = () => {
    console.log(this.state.width)
    if (this.state.width === 1000) {
      this.contract()
    } else {
      this.expand()
    }
    this.forceUpdate()
  }

  renderChildren = () => {
    return React.Children.map(this.props.children, (child) => {
      const cloned = React.cloneElement(child, {
        // xScale: this.xScale(),
        width: this.state.width,
      })
      return cloned
    })
  }

  render() {
    const { css, start, stop } = this.props
    const { width } = this.state
    return (
      <div className={css.regionViewer}>
        <div style={{ width, height: 300 }} className={css.regionArea}>
          {this.renderChildren()}
        </div>
        <button
          className={css.button}
          onClick={() =>
            this.zoom()
          }
        >
          Expand
        </button>
        <p>Start: {start}</p>
        <p>Stop: {stop}</p>
      </div>
    )
  }
}
export default RegionViewer
