import React from 'react'
import styled from 'styled-components'

import TestComponent from '../index'

const ExampleWrapper = styled.div`
  color: blue;
`

const TestExample = () => {
  return (
    <ExampleWrapper>
      <TestComponent message={'yes'} />
    </ExampleWrapper>
  )
}

export default TestExample
