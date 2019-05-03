import PropTypes from 'prop-types'
import React, { useState } from 'react'
import styled from 'styled-components'

const Wrapper = styled.span`
  position: relative;
  display: inline-block;
  border-bottom: 1px solid #000;
  font-size: 14px;
`

const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 0.375em 1.75em 0.375em 0.75em;
  border: 1px solid transparent;
  border-radius: 0.25em;
  appearance: none;
  background: none;

  &:focus {
    outline: none;
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`

const ClearButton = styled.button.attrs({ type: 'button' })`
  position: absolute;
  top: 0;
  right: 0;
  box-sizing: border-box;
  height: 100%;
  border: none;
  appearance: none;
  background: none;
  cursor: pointer;
  outline: none;

  &:active,
  &:hover {
    color: rgb(40, 94, 142);
  }
`

export const SearchInput = React.forwardRef(({ placeholder, onChange, value: propsValue }, ref) => {
  const [stateValue, setValue] = useState('')

  const value = propsValue === undefined ? stateValue : propsValue

  return (
    <Wrapper>
      <Input
        autoComplete="off"
        onChange={e => {
          setValue(e.target.value)
          onChange(e.target.value)
        }}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setValue('')
            onChange('')
          }
        }}
        placeholder={placeholder}
        ref={ref}
        type="text"
        value={value}
      />
      {value && (
        <ClearButton
          aria-label="Clear"
          tabIndex={-1}
          onClick={() => {
            setValue('')
            onChange('')
          }}
        >
          &times;
        </ClearButton>
      )}
    </Wrapper>
  )
})

SearchInput.propTypes = {
  placeholder: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
}

SearchInput.defaultProps = {
  placeholder: 'Search',
  value: undefined,
}
