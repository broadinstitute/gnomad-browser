import React from 'react'
import styled from 'styled-components'

import TestComponent from './current'

const DemoRoot = styled.div`
  color: black;
  font-size: 12px;
}
`

const Demo = () => {
  return (
    <DemoRoot>
      <TestComponent />
    </DemoRoot>
  )
}

export default Demo
