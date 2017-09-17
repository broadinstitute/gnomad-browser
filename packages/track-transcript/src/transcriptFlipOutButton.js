import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const TranscriptFlipOutButtonContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
  border: 1px blue #000;
`

const TranscriptFlipOutButton = styled.button`
  font-size: 22px;
  background-color: #FAFAFA;
  border-radius: 3px;
  border: 0;
  &:hover {
    background-color: rgb(66, 66, 66);
    color: #FAFAFA;
  }
`
const TranscriptFlipOut = ({ localHeight, leftPanelWidth, onClick }) => {
  return (
    <TranscriptFlipOutButtonContainer>
      <TranscriptFlipOutButton
        style={{
          height: localHeight - 10,
          width: leftPanelWidth - 10,
        }}
        onClick={onClick}
      >
        +
      </TranscriptFlipOutButton>
    </TranscriptFlipOutButtonContainer>
  )
}
TranscriptFlipOut.propTypes = {
  localHeight: PropTypes.number.isRequired,
  leftPanelWidth: PropTypes.number.isRequired,
  onClick: PropTypes.func.isRequired,
}
export default TranscriptFlipOut
