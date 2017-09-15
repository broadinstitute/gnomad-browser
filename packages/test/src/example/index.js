import React from 'react'
import styled from 'styled-components'

import TestComponent from '../index'

const ExampleWrapper = styled.div`
  color: blue;
`

const TestExample = () => {
  return (
    <ExampleWrapper>
      {'June 12, 2017 10:39 AM!!!'}
      <TestComponent message={'Hello there'} />
    </ExampleWrapper>
  )
}

export default TestExample
