import React from 'react'
import styled from 'styled-components'

import {
  MaterialButton,
  MaterialButtonRaised,
} from '../index'

const ExampleContainer = styled.section`
  ${'' /* display: flex; */}
  ${'' /* flex-direction: column; */}
  ${'' /* width: 50%; */}
`

const UiExample = () => {
  return (
    <ExampleContainer>
      <MaterialButton>Flat Button</MaterialButton>
      <MaterialButtonRaised>Raised Button</MaterialButtonRaised>
    </ExampleContainer>
  )
}

export default UiExample
