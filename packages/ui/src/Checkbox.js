import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

const Label = styled.label`
  user-select: none;
`

const CheckboxInput = styled.input`
  margin-right: 0.5em;
`

export const Checkbox = ({ checked, disabled, id, label, onChange }) => (
  <Label htmlFor={id}>
    <CheckboxInput
      checked={checked}
      disabled={disabled}
      id={id}
      onChange={e => {
        onChange(e.target.checked)
      }}
      type="checkbox"
    />
    {label}
  </Label>
)

Checkbox.propTypes = {
  checked: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

Checkbox.defaultProps = {
  disabled: false,
}
