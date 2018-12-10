import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

// TODO: After upgrading to React 16, use react-popper's Manager/Popper/Reference
import { InnerPopper } from 'react-popper/lib/cjs/Popper'

import { DefaultTooltip } from './DefaultTooltip'
import { Arrow, Container } from './styles'

export class TooltipAnchor extends Component {
  static propTypes = {
    childRefPropName: PropTypes.string,
    children: PropTypes.node.isRequired,
    tooltipComponent: PropTypes.func,
  }

  static defaultProps = {
    childRefPropName: 'ref',
    tooltipComponent: DefaultTooltip,
  }

  componentDidUpdate() {
    if (this.containerElement) {
      this.renderTooltipInPortal()
    }
  }

  componentWillUnmount() {
    this.removeTooltip()
  }

  referenceElementRef = el => {
    this.referenceElement = el
  }

  removeTooltip = () => {
    if (this.containerElement) {
      ReactDOM.unmountComponentAtNode(this.containerElement)
      document.body.removeChild(this.containerElement)
      this.containerElement = null
    }
  }

  renderTooltipContent = ({ ref, style, placement, arrowProps }) => {
    const {
      children,
      // https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized
      tooltipComponent: TooltipComponent,
      ...otherProps
    } = this.props

    return (
      <Container data-placement={placement} innerRef={ref} style={style}>
        <TooltipComponent {...otherProps} />
        <Arrow data-placement={placement} innerRef={arrowProps.ref} style={arrowProps.style} />
      </Container>
    )
  }

  renderTooltipInPortal = () => {
    if (!this.containerElement) {
      this.containerElement = document.createElement('div')
      document.body.appendChild(this.containerElement)
    }

    // TODO: After upgrading to React 16, use ReactDOM.createPortal
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      <InnerPopper placement="top" positionFixed referenceElement={this.referenceElement}>
        {this.renderTooltipContent}
      </InnerPopper>,
      this.containerElement
    )
  }

  render() {
    const { children, childRefPropName } = this.props
    const child = React.Children.only(children)
    return React.cloneElement(child, {
      onMouseEnter: this.renderTooltipInPortal,
      onMouseLeave: this.removeTooltip,
      [childRefPropName]: this.referenceElementRef,
    })
  }
}
