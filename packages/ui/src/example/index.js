import React from 'react'
import styled from 'styled-components'

import {
  MaterialButton,
  MaterialButtonRaised,
  MaterialCheckbox,
} from '../index'

import SegmentedControlExample from './SegmentedControlExample'
import TooltipExample from './TooltipExample'


const ExampleContainer = styled.section`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  margin-left: 20px;
  margin-top: 20px;
  height: 300px;
`

const ExampleItem = styled.div`
  margin-bottom: 10px;
`

const UiExample = () => {
  return (
    <ExampleContainer>
      <ExampleItem>
        <MaterialButton>Flat Button</MaterialButton>
      </ExampleItem>
      <ExampleItem>
        <MaterialButtonRaised>Raised Button</MaterialButtonRaised>
      </ExampleItem>
      <ExampleItem>
        <MaterialCheckbox label="Checkbox" />
      </ExampleItem>
      <ExampleItem>
        <SegmentedControlExample />
      </ExampleItem>
      <ExampleItem>
        <TooltipExample />
      </ExampleItem>
    </ExampleContainer>
  )
}

export default UiExample
