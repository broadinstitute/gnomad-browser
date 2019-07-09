import styled from 'styled-components'

export const Input = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 0.375em 0.75em;
  border: 1px solid #6c757d;
  border-radius: 0.25em;
  appearance: none;
  background: none;

  &:focus {
    outline: none;
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }

  &[aria-invalid='true'] {
    border-color: rgb(221, 44, 0);

    &:focus {
      box-shadow: 0 0 0 0.2em rgba(221, 44, 0, 0.5);
    }
  }
`
