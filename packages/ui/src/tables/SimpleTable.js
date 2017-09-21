import React from 'react'
import styled from 'styled-components'

export const Table = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
`

export const VerticalTextLabels = styled.div`
  display: flex;
  flex-direction: column;
`

export const TableVerticalLabel = styled.div`
  width: 30px;
  height: ${props => props.height}px;
  ${'' /* border: 1px solid #000; */}
  display: flex;
  align-items: center;
  ${'' /* justify-content: center; */}
`

export const VerticalLabelText = styled.span`
  margin-top: 100px;
  font-size: 16px;
  font-weight: bold;
  transform: rotate(-90deg);
  transform-origin: left top 0;
  white-space: nowrap;
`

export const TableRows = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

export const TableRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 30px;
  font-size: 14px;
  border-bottom: 1px solid lightgrey;
`

export const TableHeader = TableRow.extend`
  font-weight: bold;
  border-bottom: 1px solid black;
  padding-bottom: 5px;
`

export const TableCell = styled.div`
  width: 100px;
`

export const TableTitleColumn = TableCell.extend`
  width: 150px;
`
