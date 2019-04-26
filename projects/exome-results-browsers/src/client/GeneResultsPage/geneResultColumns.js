import React from 'react'

import browserConfig from '@browser/config'

import Link from '../Link'

const baseColumns = [
  {
    key: 'gene_name',
    heading: 'Gene Name',
    isSortable: true,
    minWidth: 90,
    searchable: true,
    render: row => (
      <Link className="grid-cell-content" target="_blank" to={`/gene/${row.gene_id}`}>
        {row.gene_name || row.gene_id}
      </Link>
    ),
  },
  {
    key: 'gene_description',
    heading: 'Description',
    isSortable: true,
    minWidth: 200,
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
  }

  if (inputColumn.renderForCSV) {
    outputColumn.renderForCSV = (row, key) => inputColumn.renderForCSV(row[key])
  }

  return outputColumn
})

const columns = [...baseColumns, ...resultColumns]

export default columns
