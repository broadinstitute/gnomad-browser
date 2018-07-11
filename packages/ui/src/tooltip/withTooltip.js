import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'

// TODO: After upgrading to React 16, use react-popper's Manager/Popper/Reference
import { InnerPopper } from 'react-popper/lib/cjs/Popper'

import { Arrow, Container } from './styles'


const rectUnion = (rect1, rect2) => ({
  bottom: Math.max(rect1.bottom, rect2.bottom),
  left: Math.min(rect1.left, rect2.left),
  right: Math.max(rect1.right, rect2.right),
  top: Math.min(rect1.top, rect2.top),
})


const isPointInRect = (rect, point) => (
  rect.bottom >= point.y
  && rect.left <= point.x
  && rect.right >= point.x
  && rect.top <= point.y
)


class TooltipAnchor extends Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    tooltipComponent: PropTypes.func.isRequired,
  }

  componentDidUpdate() {
    if (this.containerElement) {
      this.renderTooltipInPortal()
    }
  }

  componentWillUnmount() {
    this.removeTooltip()
  }

  onMouseEnter = () => {
    this.cancelTooltipRemoval()
    this.renderTooltipInPortal()
  }

  onMouseLeave = (e) => {
    // The user may want to interact with tooltip content, select tooltip text, etc.
    // If the mouse is moving towards the tooltip element when it leaves the anchor element,
    // allow some time for it to reach the tooltip before the tooltip is removed.
    // The tooltip's removal will be canceled once the mouse enters the tooltip element.

    // Approximate "is mouse moving towards tooltip" by checking if the mouse is contained
    // in the union of the bounding boxes of the tooltip and anchor elements.
    const tooltipBounds = this.containerElement.firstChild.getBoundingClientRect()
    const anchorBounds = this.referenceElement.getBoundingClientRect()
    const totalBounds = rectUnion(tooltipBounds, anchorBounds)
    const mouseLocation = { x: e.clientX, y: e.clientY }

    if (isPointInRect(totalBounds, mouseLocation)) {
      this.scheduleTooltipRemoval()
    } else {
      this.removeTooltip()
    }
  }

  referenceElementRef = (el) => {
    this.referenceElement = el
  }

  removeTooltip() {
    this.cancelTooltipRemoval()
    if (this.containerElement) {
      ReactDOM.unmountComponentAtNode(this.containerElement)
      document.body.removeChild(this.containerElement)
      this.containerElement = null
    }
  }

  cancelTooltipRemoval() {
    if (this.removeTooltipTimeout) {
      clearTimeout(this.removeTooltipTimeout)
      this.removeTooltipTimeout = null
    }
  }

  scheduleTooltipRemoval() {
    this.cancelTooltipRemoval()
    this.removeTooltipTimeout = setTimeout(() => this.removeTooltip(), 100)
  }

  renderTooltipContent = ({ ref, style, placement, arrowProps }) => {
    const {
      children,
      // https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized
      tooltipComponent: TooltipComponent,
      ...otherProps
    } = this.props

    return (
      <Container
        data-placement={placement}
        innerRef={ref}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        style={style}
      >
        <TooltipComponent {...otherProps} />
        <Arrow data-placement={placement} innerRef={arrowProps.ref} style={arrowProps.style} />
      </Container>
    )
  }

  renderTooltipInPortal() {
    if (!this.containerElement) {
      this.containerElement = document.createElement('div')
      document.body.appendChild(this.containerElement)
    }

    // TODO: After upgrading to React 16, use ReactDOM.createPortal
    ReactDOM.unstable_renderSubtreeIntoContainer(
      this,
      (
        <InnerPopper
          placement="top"
          positionFixed
          referenceElement={this.referenceElement}
        >
          {this.renderTooltipContent}
        </InnerPopper>
      ),
      this.containerElement
    )
  }

  render() {
    return React.cloneElement(
      React.Children.only(this.props.children),
      {
        onMouseEnter: this.onMouseEnter,
        onMouseLeave: this.onMouseLeave,
        ref: this.referenceElementRef,
      }
    )
  }
}


export function withTooltip(Component) {
  function WithTooltip(props) {
    return (
      <TooltipAnchor {...props} tooltipComponent={Component} />
    )
  }
  WithTooltip.displayName = `WithTooltip(${Component.displayName || Component.name || 'Component'})`
  return WithTooltip
}
