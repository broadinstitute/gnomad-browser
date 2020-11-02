import styled from 'styled-components'

const VariantCategoryMarker = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 0.5em;

  &::before {
    content: '';
    display: inline-block;
    box-sizing: border-box;
    width: 10px;
    height: 10px;
    border: 1px solid #000;
    border-radius: 5px;
    background: ${props => props.color};
  }
`

export default VariantCategoryMarker
