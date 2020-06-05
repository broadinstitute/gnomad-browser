import QuestionIcon from '@fortawesome/fontawesome-free/svgs/solid/question.svg'
import React from 'react'
import styled from 'styled-components'

import { Button } from '@gnomad/ui'

import helpState from './helpState'

const StyledHelpButton = styled(Button).attrs({ type: 'button' })`
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 50px;
  height: 50px;
  padding: 0;
  border-radius: 50%;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.35);

  svg {
    position: relative;
    top: 1px;
    width: 22px;
    height: 22px;
    fill: #6c757d;
  }
`

const HelpButton = () => {
  return (
    <StyledHelpButton
      onClick={() => {
        const change = {
          isOpen: !helpState.isOpen,
        }
        if (!helpState.isOpen) {
          change.selectedTopic = null
        }
        helpState.set(change)
      }}
    >
      <QuestionIcon />
    </StyledHelpButton>
  )
}

export default HelpButton
