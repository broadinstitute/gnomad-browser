import React, { PropTypes, Component } from 'react'

class RegionViewer extends Component {
  static propTypes = {
    css: PropTypes.object.isRequired,
    width: PropTypes.number.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }

  state = {
    width: this.props.width,
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

  render() {
    const { css, start, stop } = this.props
    const { width } = this.state
    return (
      <div className={css.regionViewer}>
        <div style={{ width, height: 300 }} className={css.regionArea} />
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
