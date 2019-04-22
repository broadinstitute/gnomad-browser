import styled from 'styled-components'

export const Select = styled.select`
  padding: 0.375em 1.5em 0.375em 0.75em;
  border: 1px solid #6c757d;
  border-radius: 0.25em;
  appearance: none;
  background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
  background-position: center right;
  background-repeat: no-repeat;

  &:focus {
    outline: none;
    border-color: rgb(70, 130, 180);
    box-shadow: 0 0 0 0.2em rgba(70, 130, 180, 0.5);
  }
`
