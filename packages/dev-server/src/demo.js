import React from 'react'
import { hot } from 'react-hot-loader/root'
import styled from 'styled-components'

import TestComponent from './current'

const DemoRoot = styled.div`
  color: black;
  font-size: 12px;
`

const Demo = () => (
  <DemoRoot>
    <TestComponent />
  </DemoRoot>
)

export default hot(Demo)
