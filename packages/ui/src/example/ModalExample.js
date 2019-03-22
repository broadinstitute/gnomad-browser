import React, { Component } from 'react'

import { Button, Modal } from '..'

export default class ModalExample extends Component {
  state = {
    isModalOpen: false,
  }

  render() {
    const { isModalOpen } = this.state

    return (
      <div>
        <Button
          disabled={isModalOpen}
          onClick={() => {
            this.setState({
              isModalOpen: true,
            })
          }}
        >
          Open modal
        </Button>

        {isModalOpen && (
          <Modal
            onRequestClose={() => {
              this.setState({ isModalOpen: false })
            }}
            title="Example modal"
          >
            Modal content
          </Modal>
        )}
      </div>
    )
  }
}
