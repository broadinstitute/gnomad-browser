import styled from 'styled-components'


export const ModalBody = styled.div`
  padding: 1rem;
`


export const ModalContent = styled.div`
  background: #fafafa;
  border: 1px solid #c8c8c8;
  border-radius: 5px;
  font-family: Roboto, sans-serif;
  font-size: 16px;
`


export const ModalFooter = styled.footer`
  border-top: 1px solid #e9ecef;
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
`


export const ModalHeader = styled.header`
  border-bottom: 1px solid #e9ecef;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 1rem;
`


export const ModalHeaderCloseButton = styled.button`
  background: none;
  border: none;
  color: #0008;
  margin: -1rem -1rem -1rem auto;
  padding: 1rem;
  -webkit-appearance: none;

  &:hover {
    color: #000;
  }
`


export const underlayStyle = {
  paddingTop: '2em',
}
