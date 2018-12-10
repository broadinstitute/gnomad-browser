import QuestionMark from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { InfoModal } from '@broad/ui'

import helpConfig from '@browser/help'

const Button = styled.button`
  padding: 0 3px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: inherit;
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
          <QuestionMark style={{ height: '14px', width: '14px' }} />
        </Button>
        {isOpen && (
          <InfoModal
            onRequestClose={() => {
              this.setState({ isOpen: false })
            }}
            title={helpConfig[topic].title || 'Help'}
            width="50%"
          >
            <HelpModalContent>{helpConfig[topic].render()}</HelpModalContent>
          </InfoModal>
        )}{' '}
      </span>
    )
  }
}
