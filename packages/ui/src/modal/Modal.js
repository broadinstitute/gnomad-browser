import PropTypes from 'prop-types'
import React, { Component } from 'react'
import AriaModal from 'react-aria-modal'

import { Button } from '../Button'
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalHeaderCloseButton,
  ModalTitle,
  underlayStyle,
} from './modalStyles'

function getApplicationNode() {
  return document.getElementById('root')
}

let nextId = 0

function getId() {
  const id = `${nextId}`
  nextId += 1
  return id
}

export class Modal extends Component {
  static propTypes = {
    children: PropTypes.node,
    footer: PropTypes.node,
    id: PropTypes.string,
    onRequestClose: PropTypes.func.isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    title: PropTypes.string.isRequired,
  }

  static defaultProps = {
    children: undefined,
    footer: undefined,
    id: undefined,
    size: 'medium',
  }

  fallbackId = `modal-${getId()}`

  getId() {
    const { id } = this.props
    return id || this.fallbackId
  }

  render() {
    const { children, footer, onRequestClose, size, title } = this.props

    return (
      <AriaModal
        dialogId={this.getId()}
        focusDialog
        getApplicationNode={getApplicationNode}
        onExit={onRequestClose}
        titleId={`${this.getId()}-title`}
        underlayStyle={underlayStyle}
      >
        <ModalContent className="modal-content" size={size}>
          <ModalHeader>
            <ModalTitle id={`${this.getId()}-title`}>{title}</ModalTitle>
            <ModalHeaderCloseButton aria-label="Close" onClick={onRequestClose} type="button">
              <span aria-hidden="true">&times;</span>
            </ModalHeaderCloseButton>
          </ModalHeader>
          <ModalBody>{children}</ModalBody>
          <ModalFooter>{footer || <Button onClick={onRequestClose}>Ok</Button>}</ModalFooter>
        </ModalContent>
      </AriaModal>
    )
  }
}
