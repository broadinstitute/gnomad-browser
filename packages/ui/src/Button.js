import { darken, transparentize } from 'polished'
import styled from 'styled-components'

export const BaseButton = styled.button.attrs({
  type: 'button',
})`
  padding: 0.375em 0.75em;
  border-color: ${props => props.borderColor};
  border-style: solid;
  border-width: 1px;
  border-radius: 0.5em;
  background-color: ${props => props.backgroundColor};
  color: ${props => props.textColor};
  cursor: pointer;
  font-size: 1em;
  outline: none;
  user-select: none;

  &:active,
  &:hover {
    background-color: ${props => darken(0.15, props.backgroundColor)};
  }

  &:disabled {
    background-color: ${props => transparentize(0.5, props.backgroundColor)};
    cursor: not-allowed;
  }

  &:focus {
    box-shadow: ${props => `0 0 0 0.2em ${transparentize(0.5, props.borderColor)}`};
  }

  svg {
    position: relative;
    top: 0.11em;
    width: 0.9em;
    height: 0.9em;
  }
`

/* stylelint-disable block-no-empty */
export const Button = styled(BaseButton).attrs({
  backgroundColor: '#f8f9fa',
  borderColor: '#6c757d',
})``

export const PrimaryButton = styled(BaseButton).attrs({
  backgroundColor: '#428bca',
  borderColor: '#428bca',
  textColor: '#fff',
})``
/* stylelint-enable block-no-empty */

export const TextButton = styled.button.attrs({
  type: 'button',
})`
  padding: 0;
  border: none;
  background: none;
  color: #428bca;
  cursor: pointer;
  font-size: 1em;
  outline: none;
  user-select: none;

  &:active,
  &:hover {
    color: #be4248;
  }

  &:disabled {
    color: ${transparentize(0.5, '#428bca')};
    cursor: not-allowed;
  }

  &:focus {
    text-decoration: underline;
  }
`
