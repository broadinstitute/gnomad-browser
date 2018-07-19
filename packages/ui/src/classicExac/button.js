import styled from 'styled-components'

export const ClassicExacButton = styled.button`
  font-size: 12px;
  font-family: Roboto;
  border: 0;
  border-color: rgb(53, 126, 189);
  border-top-color: rgb(53, 126, 189);
  background-color: ${({ isActive }) => (
    isActive ? 'rgb(40, 94, 142)' : 'rgb(53, 126, 189)'
  )};
  padding: 10px 10px 10px 10px;
  color: ;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};

  &:hover {
    background-color: ${({ disabled }) => (
      disabled ? 'rgb(53, 126, 189)' : 'rgb(40, 94, 142)'
    )};
    border-color: ${({ disabled }) => (
      disabled ? 'rgb(53, 126, 189)' : 'rgb(40, 94, 142)'
    )};
  }

  color: ${({ disabled }) => (
    disabled ? '#FAFAFA' : 'white'
  )};
`

export const ClassicExacButtonFirst = ClassicExacButton.extend`
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;
  ${'' /* border-right-width: 1.5px; */}
  ${'' /* border-right-color: rgb(40, 94, 142); */}
  border-right-style: solid;
`

export const ClassicExacButtonLast = ClassicExacButton.extend`
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  ${'' /* border-left-width: 1.5px; */}
  ${'' /* border-left-color: rgb(40, 94, 142); */}
`

export const ClassicExacButtonGroup = styled.div`
  display: flex;
  flex-direction: row;
`
