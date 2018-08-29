import React, { Component } from 'react'

import { Button, InfoModal } from '..'

export default class InfoModalExample extends Component {
  state = {
    isModalOpen: false,
  }

  render() {
    return (
      <div>
        <Button
          disabled={this.state.isModalOpen}
          onClick={() => {
            this.setState({
              isModalOpen: true,
            })
          }}
        >
          Open modal
        </Button>

        {this.state.isModalOpen && (
          <InfoModal
            onRequestClose={() => {
              this.setState({ isModalOpen: false })
            }}
            title="Example modal"
            width="500px"
          >
            Modal content
          </InfoModal>
        )}
      </div>
    )
  }
}
