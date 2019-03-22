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
    onRequestClose: PropTypes.func.isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    title: PropTypes.string.isRequired,
  }

  static defaultProps = {
    children: undefined,
    size: 'medium',
  }

  id = getId()

  withIdPrefix(str) {
    return `modal-${this.id}-${str}`
  }

  render() {
    const { children, onRequestClose, size, title } = this.props

    return (
      <AriaModal
        dialogId={`${this.withIdPrefix('dialog')}`}
        focusDialog
        getApplicationNode={getApplicationNode}
        onExit={onRequestClose}
        titleId={this.withIdPrefix('title')}
        underlayStyle={underlayStyle}
      >
        <ModalContent size={size}>
          <ModalHeader>
            <h2 id={this.withIdPrefix('title')}>{title}</h2>
            <ModalHeaderCloseButton aria-label="Close" onClick={onRequestClose} type="button">
              <span aria-hidden="true">&times;</span>
            </ModalHeaderCloseButton>
          </ModalHeader>
          <ModalBody>{children}</ModalBody>
          <ModalFooter>
            <Button onClick={onRequestClose}>Ok</Button>
          </ModalFooter>
        </ModalContent>
      </AriaModal>
    )
  }
}
