/**
 * This is where you can develop your component (TranscriptViewer) in a mock React environment
 * Useful for testing props passed to the component (e.g. data from other parts of your app),
 * and developing your component with hot reloading
 * Start this example by running `make prototype` in the t2d root dir
 * Then open your browser navigate to localhost:8000
 */

import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { TranscriptViewer } from '../index'

const ExampleWrapper = styled.div``

class TranscriptViewerExample extends PureComponent {
  render() {
    return (
      <ExampleWrapper>
        <TranscriptViewer gene={'DMD'}  />
      </ExampleWrapper>
    )
  }
}

export default TranscriptViewerExample
