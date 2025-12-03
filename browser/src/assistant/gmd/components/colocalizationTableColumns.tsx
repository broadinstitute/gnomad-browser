import React from 'react'
import { Cell, NumericCell } from '../../../tableCells'
import { makeNumericCompareFunction, makeStringCompareFunction } from '../../../VariantList/sortUtilities'

const colocalizationTableColumns = [
  {
    key: 'trait1_original',
    heading: 'Trait 1',
    minWidth: 200,
    compareFunction: makeStringCompareFunction('trait1_original'),
    render: (row: any) => <Cell>{row.trait1_original}</Cell>,
  },
  {
    key: 'trait2_original',
    heading: 'Trait 2',
    minWidth: 200,
    compareFunction: makeStringCompareFunction('trait2_original'),
    render: (row: any) => <Cell>{row.trait2_original}</Cell>,
  },
  {
    key: 'PP.H4.abf',
    heading: 'P(H4)',
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('PP.H4.abf'),
    render: (row: any) => <NumericCell>{row['PP.H4.abf'].toFixed(3)}</NumericCell>,
  },
  {
    key: 'clpp',
    heading: 'CLPP',
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('clpp'),
    render: (row: any) => <NumericCell>{row.clpp.toFixed(3)}</NumericCell>,
  },
]

export default colocalizationTableColumns
