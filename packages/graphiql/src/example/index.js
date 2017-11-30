import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { GraphiQL } from '../index'

const Wrapper = styled.div`

`

class GraphExample extends PureComponent {
  state = {}
  render() {
    return (
      <Wrapper>
        <GraphiQL />
      </Wrapper>
    )
  }
}

export default GraphExample
