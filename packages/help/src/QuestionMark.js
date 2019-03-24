import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import { actions as helpActions } from './redux'

const Button = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-self: center;
  outline: none;
  padding: 0 3px;
  border: none;
  background: none;
  cursor: pointer;

  svg {
    position: relative;
    top: 0.13em;
    width: 14px;
    height: 14px;
    border-radius: 7px;
  }

  &:focus svg {
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

export const QuestionMark = connect(
  null,
  helpActions
)(({ topic, setActiveHelpTopic, style, toggleHelpWindow }) => (
  <Button
    onClick={() => {
      setActiveHelpTopic(topic)
      toggleHelpWindow()
    }}
    style={style}
  >
    <QuestionMarkIcon />
  </Button>
))

QuestionMark.propTypes = {
  topic: PropTypes.string.isRequired,
}
