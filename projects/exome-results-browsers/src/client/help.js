import QuestionMark from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Modal } from '@broad/ui'

import helpConfig from '@browser/help'

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  outline: none;
  padding: 0 3px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: inherit;

  svg {
    position: relative;
    top: 0.11em;
    width: 0.9em;
    height: 0.9em;
    border-radius: 0.45em;
  }

  &:focus svg {
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

const HelpModalContent = styled.div`
  p {
    margin: 0 0 1em;
    line-height: 1.5;
  }
`

export class HelpPopup extends Component {
  static propTypes = {
    topic: PropTypes.string.isRequired,
  }

  state = {
    isOpen: false,
  }

  render() {
    const { topic } = this.props
    if (!helpConfig[topic]) {
      return null
    }

    const { isOpen } = this.state
    return (
      <span>
        <Button
          type="button"
          onClick={() => {
            this.setState({ isOpen: true })
          }}
        >
          <QuestionMark />
        </Button>
        {isOpen && (
          <Modal
            onRequestClose={() => {
              this.setState({ isOpen: false })
            }}
            size="large"
            title={helpConfig[topic].title || 'Help'}
          >
            <HelpModalContent>{helpConfig[topic].render()}</HelpModalContent>
          </Modal>
        )}{' '}
      </span>
    )
  }
}
