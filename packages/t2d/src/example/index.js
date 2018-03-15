import React, { PureComponent } from 'react'
import styled from 'styled-components'

import TestComponent from '../index'

const ExampleWrapper = styled.div`
  color: blue;
`

class TestExample extends PureComponent {
  state = { answer: 32 }
  async componentDidMount() {
    this.setState({  // eslint-disable-line
      answer: await this.asyncFunction()
    })
  }
  asyncFunction = () => {
    return Promise.resolve(37)
  }
  render() {
    return (
      <ExampleWrapper>
        <TestComponent message={this.state.answer} />
      </ExampleWrapper>
    )
  }
}

export default TestExample
