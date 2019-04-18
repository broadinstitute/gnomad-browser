import React from 'react'

import browserConfig from '@browser/config'

import Link from '../Link'

const renderExponentialNumberCell = (row, key) => {
  const number = row[key]
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

const columns = [
  {
    key: 'gene_name',
    heading: 'Gene Name',
    isSortable: true,
    minWidth: 100,
    searchable: true,
    render: row => (
      <Link className="grid-cell-content" target="_blank" to={`/gene/${row.gene_name}`}>
        {row.gene_name}
      </Link>
    ),
  },
  {
    key: 'gene_description',
    heading: 'Description',
    isSortable: true,
    minWidth: 140,
  },
  {
    key: 'gene_id',
    heading: 'Gene ID',
    isSortable: true,
    minWidth: 140,
  },
  ...browserConfig.geneResults.categories
    .map(({ id, label }) => [
      {
        key: `xcase_${id}`,
        heading: `Case ${label}`,
        isSortable: true,
        minWidth: 60,
      },
      {
        key: `xctrl_${id}`,
        heading: `Ctrl ${label}`,
        isSortable: true,
        minWidth: 60,
      },
      {
        key: `pval_${id}`,
        heading: `P-Val ${label}`,
        isSortable: true,
        minWidth: 80,
        render: renderExponentialNumberCell,
      },
    ])
    .reduce((acc, cols) => acc.concat(cols), []),
  {
    key: 'pval_meta',
    heading: 'P-Val Meta',
    isSortable: true,
    minWidth: 80,
    render: renderExponentialNumberCell,
  },
]

export default columns
