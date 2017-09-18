import React from 'react'
import styled from 'styled-components'

export const ClassicExacButton = styled.button`
  font-size: 12px;
  border: 0;
  border-color: rgb(53, 126, 189);
  border-top-color: rgb(53, 126, 189);
  background-color: #428bca;
  padding: 10px 10px 10px 10px;
  color: white;
  cursor: pointer;

  &:hover {
    background-color: rgb(40, 94, 142);
    border-color: rgb(40, 94, 142);
  }
`

export const ClassicExacButtonFirst = ClassicExacButton.extend`
  border-bottom-left-radius: 4px;
  border-top-left-radius: 4px;
  border-right-width: 1.5px;
  border-right-color: rgb(53, 126, 189);
  border-right-style: solid;
`

export const ClassicExacButtonLast= ClassicExacButton.extend`
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
  border-left-width: 1.5px;
  border-left-color: rgb(53, 126, 189);
`

export const ClassicExacButtonGroup = styled.div`
  display: flex;
  flex-direction: row;
`

export const ClassicVariantCategoryButtonGroup = () => (
  <ClassicExacButtonGroup>
    <ClassicExacButtonFirst>All</ClassicExacButtonFirst>
    <ClassicExacButton>Missense + LoF</ClassicExacButton>
    <ClassicExacButtonLast>LoF</ClassicExacButtonLast>
  </ClassicExacButtonGroup>
)
