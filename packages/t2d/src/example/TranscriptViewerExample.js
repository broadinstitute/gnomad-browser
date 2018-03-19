/* eslint-disable react/prop-types */
/**
 * This is where you can develop your component (TranscriptViewer) in a mock React environment
 * Useful for testing props passed to the component (e.g. data from other parts of your app),
 * and developing your component with hot reloading
 * Start this example by running `make prototype` in the t2d root dir
 * Then open your browser navigate to localhost:8000
 */

import React, { Component } from 'react'
import styled from 'styled-components'

import { TranscriptViewer } from '../index'

const ExampleWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 20px;
`

const Controls = styled.div`
  margin-left: 50px;
`

class TranscriptViewerExample extends Component {
  state = {
    showGtex: false,
  }

  toggleShowGtex = () => this.setState({ showGtex: !this.state.showGtex })

  render() {
    return (
      <ExampleWrapper>
        <Controls>
          <h2>Gene: {this.props.currentGene}</h2>
          <input
            id="gtex"
            type="checkbox"
            checked={this.state.showGtex}
            onChange={event => this.toggleShowGtex()}
          />
          <label style={{ marginLeft: '5px' }} htmlFor="qcFilter">
            Show GTEx
          </label>
        </Controls>
        <TranscriptViewer
          gene={this.props.currentGene}
          showGtex={this.state.showGtex}
          key={this.props.currentGene}
        />
      </ExampleWrapper>
    )
  }
}

export default TranscriptViewerExample
