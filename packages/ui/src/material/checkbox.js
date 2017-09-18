import React from 'react'
import styled from 'styled-components'

const checkboxLabelHeight = 24
const checkboxButtonSize = 16

const MaterialCheckboxContainer = styled.label`
  position: relative;
  z-index: 1;
  vertical-align: middle;
  display: inline-block;
  box-sizing: border-box;
  width: 100%;
  height: ${checkboxLabelHeight}px;
  margin: 0;
  padding: 0;
  border: 1px solid #000;
`

const MaterialCheckboxInput = styled.input`
  line-height: ${checkboxButtonSize};
  position: absolute;
  width: 0;
  height: 0;
  margin: 0;
  padding: 0;
  opacity: 0;
  -ms-appearance: none;
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  border: none;
`

const MaterialCheckboxOutline = styled.span`

`

const MaterialCheckboxLabel = styled.span`

`

const MaterialCheckbox = ({ label }) => (
  <MaterialCheckboxContainer>
    <MaterialCheckboxInput type="checkbox" />
    <MaterialCheckboxLabel>{label}</MaterialCheckboxLabel>
  </MaterialCheckboxContainer>
)

export default MaterialCheckbox
