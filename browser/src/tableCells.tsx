import React from 'react'
import styled from 'styled-components'

export const Cell = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const NumericCell = styled(Cell)`
  width: 100%;
  padding-right: calc(20px - 0.5em);
  text-align: right;
`

const AlleleCountCell = styled.span`
  width: 7ch;
  margin: 0 auto;
  text-align: right;
`

export const renderAlleleCountCell = (row: any, key: any) => {
  return <AlleleCountCell>{row[key]}</AlleleCountCell>
}

const AlleleFrequencyCell = styled.span`
  width: 8ch;
  margin: 0 auto;
  text-align: right;
`

export const renderAlleleFrequencyCell = (row: any, key: any) => {
  const number = row[key]
  let s
  if (number === null || number === undefined) {
    s = ''
  } else {
    const truncated = Number(number.toPrecision(3))
    if (truncated === 0 || truncated === 1) {
      s = number.toFixed(0)
    } else {
      s = truncated.toExponential(2)
    }
  }

  return <AlleleFrequencyCell>{s}</AlleleFrequencyCell>
}
