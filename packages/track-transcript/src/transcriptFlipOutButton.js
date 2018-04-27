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

const TranscriptFlipOut = ({ fanOutIsOpen, onClick, strand }) => {
  let direction
  if (strand === '+') {
    direction = 'right'
  } else if (strand === '-') {
    direction = 'left'
  } else {
    direction = null
  }

  const label = fanOutIsOpen
    ? 'Hide alternate transcripts'
    : 'Show alternate transcripts'

  const icon = fanOutIsOpen
    ? 'fa-caret-down'
    : 'fa-caret-right'

  return (
    <TranscriptFlipOutButtonContainer>
      <TranscriptFlipOutButton
        aria-label={label}
        onClick={onClick}
        title={label}
      >
        <i
          aria-hidden
          className={`fa ${icon}`}
        />
      </TranscriptFlipOutButton>
      {direction && <i
        className={`fa fa-arrow-circle-${direction} fa-2x`}
        aria-hidden="true"
        style={{
          marginRight: '10px',
          color: 'rgb(66, 66, 66)',
        }}
      />}
    </TranscriptFlipOutButtonContainer>
  )
}
TranscriptFlipOut.propTypes = {
  fanOutIsOpen: PropTypes.bool,
  onClick: PropTypes.func,
  strand: PropTypes.string,
}
TranscriptFlipOut.defaultProps = {
  fanOutIsOpen: false,
  onClick: () => {},
  strand: null,
}
export default TranscriptFlipOut
