import styled from 'styled-components'

const MaterialButton = styled.button`
  background: transparent;
  border: none;
  border-radius: 2px;
  color: black;
  position: relative;
  height: 25px;
  min-width: 64px;
  outline: none;
  cursor: pointer;
  text-align: center;
  line-height: 25px;
  text-transform: uppercase;
  text-decoration: none;
  font-size: 12px;
  font-weight: bold;
  font-family: Roboto;

  transition: box-shadow 0.2s cubic-bezier(0.4, 0, 1, 1),
            background-color 0.2s cubic-bezier(0.4, 0, 1, 1),
            color 0.2s cubic-bezier(0.4, 0, 1, 1);

  &:hover {
    background-color: #EEEEEE;
  }

  &:active {
    background-color: #9E9E9E;
  }
`

export const MaterialButtonRaised = styled(MaterialButton)`
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14);
`
