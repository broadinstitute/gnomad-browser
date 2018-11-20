import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { actions as helpActions } from './redux'

const QuestionMarkContainer = styled.span`
  display: ${props => props.display};
  align-items: center;
  font-size: ${props => props.size};
  padding-left: ${props => props.padding};
  padding-right: ${props => props.padding};
  cursor: pointer;
  color: rgb(66, 66, 66);

  @media print {
    display: none;
  }
`

const QuestionMark = ({
  topic,
  setActiveTopic,
  toggleHelpWindow,
  display,
  size,
  padding,
}) => {
  return (
    <QuestionMarkContainer
      onClick={(event) => {
        event.preventDefault()
        setActiveTopic(topic)
        toggleHelpWindow()
      }}
      display={display}
      size={size}
      padding={padding}
    >
      <i className="fa fa-question-circle" aria-hidden="true" />
    </QuestionMarkContainer>
  )
}
QuestionMark.propTypes = {
  topic: PropTypes.string,
  setActiveTopic: PropTypes.func,
  toggleHelpWindow: PropTypes.func,
  size: PropTypes.string,
  padding: PropTypes.string,
  display: PropTypes.string,
}
QuestionMark.defaultProps = {
  topic: '',
  setActiveTopic: () => {},
  toggleHelpWindow: () => {},
  display: 'flex',
  size: '14px',
  padding: '10px',
}
export default connect(null, helpActions)(QuestionMark)

export const HelpLink = connect(null, helpActions)(({
  topic,
  children,
  setActiveTopic,
  toggleHelpWindow,
}) => {
  return (
    <a
      href="#"
      onClick={(event) => {
        event.preventDefault()
        setActiveTopic(topic)
        toggleHelpWindow()
      }}
    >
      {children}
    </a>
  )
})
