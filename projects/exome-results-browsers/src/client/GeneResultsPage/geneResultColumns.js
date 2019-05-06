import React from 'react'
import styled from 'styled-components'

import browserConfig from '@browser/config'

import Link from '../Link'

const CountCell = styled.span`
  overflow: hidden;
  width: 100%;
  padding-right: 25px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const renderCount = (row, key) => <CountCell>{row[key]}</CountCell>

const NumberCell = styled.span`
  overflow: hidden;
  width: 100%;
  padding-right: 15px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const renderFloat = (row, key) => {
  const value = row[key]
  if (value === null) {
    return ''
  }
  const truncated = Number(value.toPrecision(3))
  if (truncated === 0) {
    return <NumberCell>0</NumberCell>
  }
  return <NumberCell>{truncated.toExponential()}</NumberCell>
}

const baseColumns = [
  {
    key: 'gene_name',
    heading: 'Gene Name',
    isSortable: true,
    minWidth: 100,
    render: row => (
      <Link
        className="grid-cell-content"
        target="_blank"
        to={`/gene/${row.gene_id || row.gene_name}`}
      >
        {row.gene_name || row.gene_id}
      </Link>
    ),
  },
  {
    key: 'gene_description',
    heading: 'Description',
    isSortable: true,
    minWidth: 200,
    grow: 4,
  },
]

const resultColumns = browserConfig.geneResults.columns.map(inputColumn => {
  const outputColumn = {
    isSortable: true,
    minWidth: 65,
    ...inputColumn,
  }

  if (inputColumn.render) {
    outputColumn.render = (row, key) => inputColumn.render(row[key])
  } else {
    outputColumn.render = inputColumn.type === 'int' ? renderCount : renderFloat
  }

  if (inputColumn.renderForCSV) {
    outputColumn.renderForCSV = (row, key) => inputColumn.renderForCSV(row[key])
  }

  return outputColumn
})

const columns = [...baseColumns, ...resultColumns]

export default columns
