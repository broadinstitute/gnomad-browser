import QuestionMarkIcon from '@fortawesome/fontawesome-free/svgs/solid/question-circle.svg'
import { hideVisually } from 'polished'
import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

import HelpTopicModal from './HelpTopicModal'

const Button = styled.button.attrs({ type: 'button' })`
  display: inline-flex;
  align-self: center;
  outline: none;
  padding: 0 3px;
  border: none;
  background: none;
  cursor: pointer;

  img {
    position: relative;
    top: 0.13em;
    width: 14px;
    height: 14px;
    border-radius: 7px;
  }

  &:focus img {
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

const InfoButton = ({ topic: topicId, ...otherProps }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  return (
    <>
      <Button
        {...otherProps}
        onClick={() => {
          setIsModalOpen(true)
        }}
      >
        <img src={QuestionMarkIcon} alt="" aria-hidden="true" />
        <span style={hideVisually()}>More information</span>
      </Button>
      {isModalOpen && (
        <HelpTopicModal
          initialFocusOnButton={false}
          topicId={topicId}
          onRequestClose={() => {
            setIsModalOpen(false)
          }}
        />
      )}
    </>
  )
}

InfoButton.propTypes = {
  topic: PropTypes.string.isRequired,
}

export default InfoButton
