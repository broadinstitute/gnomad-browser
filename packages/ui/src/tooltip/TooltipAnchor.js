import PropTypes from 'prop-types'
import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { Manager, Popper, Reference } from 'react-popper'

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

  state = {
    isVisible: false,
  }

  constructor(props) {
    super(props)
    this.containerElement = document.createElement('div')
  }

  componentDidMount() {
    document.body.appendChild(this.containerElement)
  }

  componentWillUnmount() {
    document.body.removeChild(this.containerElement)
  }

  showTooltip = () => {
    this.setState({ isVisible: true })
  }

  hideTooltip = () => {
    this.setState({ isVisible: false })
  }

  render() {
    const {
      children,
      childRefPropName,
      // https://reactjs.org/docs/jsx-in-depth.html#user-defined-components-must-be-capitalized
      tooltipComponent: TooltipComponent,
      ...otherProps
    } = this.props
    const { isVisible } = this.state

    return (
      <Manager>
        <Reference>
          {({ ref }) =>
            React.cloneElement(React.Children.only(children), {
              onMouseEnter: this.showTooltip,
              onMouseLeave: this.hideTooltip,
              [childRefPropName]: ref,
            })
          }
        </Reference>
        {isVisible &&
          ReactDOM.createPortal(
            <Popper placement="top">
              {({ ref, style, placement, arrowProps }) => (
                <Container data-placement={placement} innerRef={ref} style={style}>
                  <TooltipComponent {...otherProps} />
                  <Arrow
                    data-placement={placement}
                    innerRef={arrowProps.ref}
                    style={arrowProps.style}
                  />
                </Container>
              )}
            </Popper>,
            this.containerElement
          )}
      </Manager>
    )
  }
}
