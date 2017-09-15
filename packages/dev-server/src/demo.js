import React, { PropTypes } from 'react'
import styled from 'styled-components'

import TestComponent from '@broad/test'

const DemoRoot = styled.div`
  color: black;
  font-size: 12px;
}
`

const Demo = () => {
  return (
    <DemoRoot>
      <h1>test server</h1>
      <TestComponent />
    </DemoRoot>
  )
}

export default Demo
