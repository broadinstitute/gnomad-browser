import React, { Component } from 'react'
import styled from 'styled-components'

import { StructureViewer } from '../index'

const ExampleWrapper = styled.div``

class StructureViewerExample extends Component {
  render() {
    return (
      <ExampleWrapper>
        <StructureViewer />
      </ExampleWrapper>
    )
  }
}

export default StructureViewerExample
