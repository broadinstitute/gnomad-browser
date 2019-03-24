import QuestionIcon from '@fortawesome/fontawesome-free/svgs/solid/question.svg'
import TimesIcon from '@fortawesome/fontawesome-free/svgs/solid/times.svg'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { Button } from '@broad/ui'

import { actions as helpActions, isHelpWindowOpen } from './redux'

export const HelpButtonFloatingContainer = styled(Button).attrs({ type: 'button' })`
  position: fixed;
  z-index: 10;
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

export const HelpButton = connect(
  state => ({ isActive: isHelpWindowOpen(state) }),
  helpActions
)(({ isActive, toggleHelpWindow }) => (
  <HelpButtonFloatingContainer isActive={isActive} onClick={toggleHelpWindow}>
    {isActive ? <TimesIcon /> : <QuestionIcon />}
  </HelpButtonFloatingContainer>
))
