import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

const TranscriptFlipOutButtonContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  width: 100%;
  border: 1px blue #000;

  i {
    margin-right: 10px;
    color: rgb(66, 66, 66);
  }
`

const TranscriptFlipOutButton = styled.button`
  font-size: 26px;
  background-color: #FAFAFA;
  border-radius: 3px;
  border: 0;
  width: 60%;
  height: 60%;
  cursor: pointer;
  user-select: none;
  margin: 5px 5px 5px 5px;

  &:hover {
    background-color: lightgrey;
    color: rgb(66, 66, 66);
  }
`

const TranscriptFlipOut = ({ onClick, strand }) => {
  const direction = strand === '+' ? 'right' : 'left'
  return (
    <TranscriptFlipOutButtonContainer>
      <TranscriptFlipOutButton
        onClick={onClick}
      >
        +
      </TranscriptFlipOutButton>
      <i
        className={`fa fa-arrow-circle-${direction} fa-2x`}
        aria-hidden="true"
      />
    </TranscriptFlipOutButtonContainer>
  )
}
TranscriptFlipOut.propTypes = {
  onClick: PropTypes.func.isRequired,
  strand: PropTypes.func.isRequired,
}
export default TranscriptFlipOut
