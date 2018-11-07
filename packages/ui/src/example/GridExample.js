import React from 'react'
import styled from 'styled-components'

import { Grid } from '../Grid'

const Wrapper = styled.div`
  width: 30%;
`

const numCols = 20
const numRows = 1000

const data = [...Array(numRows)].map((rVal, i) =>
  [...Array(numCols)].map((cVal, j) => `${String.fromCharCode(65 + j)}${i}`)
)

const columns = [...Array(10)].map((val, index) => ({
  heading: `Column ${String.fromCharCode(65 + index)}`,
  key: index.toString(),
  isSortable: true,
  render: row => row[index],
}))

const GridExample = () => (
  <Wrapper>
    <Grid columns={columns} data={data} numRowsRendered={10} rowKey={row => row[0]} />
  </Wrapper>
)

export default GridExample
