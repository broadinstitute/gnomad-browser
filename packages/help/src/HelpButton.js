import React from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'

import { actions as helpActions, isHelpWindowOpen } from './redux'

export const HelpButtonFloatingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  width: 50px;
  height: 50px;
  bottom: 20px;
  right: 20px;
  z-index: 10;
  background-color: ${({ isActive }) => isActive ? 'rgba(10, 121, 191, 0.1)' : '#F5F5F5'};
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.16), 0 1px 3px rgba(0,0,0,0.23);
  cursor: pointer;
  color: ${({ isActive }) => isActive ? 'rgb(40, 94, 142)' : 'lightgrey'};
  user-select: none;
  &:hover {
    background-color: rgba(10, 121, 191, 0.1);
    color: rgb(40, 94, 142);
  }
`

const HelpButtonIcon = styled.span`
  font-size: 30px;
`

const HelpImage = styled.img`
  max-width: 20px;
`

const HelpButton = ({ toggleHelpWindow, isHelpWindowOpen }) => {
  return (
    <HelpButtonFloatingContainer isActive={isHelpWindowOpen} onClick={toggleHelpWindow}>
      <HelpButtonIcon>
        {/* <HelpImage  src="https://storage.googleapis.com/gnomad-browser/assets/gnome-helper.png" /> */}
        {isHelpWindowOpen ?
          <i className="fa fa-times" aria-hidden="true" /> :
          <i className="fa fa-question" aria-hidden="true" /> }
      </HelpButtonIcon>
    </HelpButtonFloatingContainer>
  )
}

export default connect(
  state => ({
    isHelpWindowOpen: isHelpWindowOpen(state),
  }),
  helpActions
)(HelpButton)
