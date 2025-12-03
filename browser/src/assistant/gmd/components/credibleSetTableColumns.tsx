import React from 'react'
import { Cell, NumericCell } from '../../../tableCells'
import Link from '../../../Link'
import { makeNumericCompareFunction, makeStringCompareFunction } from '../../../VariantList/sortUtilities'
import { TooltipAnchor, TooltipHint } from '@gnomad/ui'

const credibleSetTableColumns = [
  {
    key: 'resource',
    heading: 'Resource',
    minWidth: 100,
    compareFunction: makeStringCompareFunction('resource'),
    render: (row: any) => <Cell>{row.resource}</Cell>,
  },
  {
    key: 'data_type',
    heading: 'Data Type',
    minWidth: 80,
    compareFunction: makeStringCompareFunction('data_type'),
    render: (row: any) => <Cell>{row.data_type}</Cell>,
  },
  {
    key: 'trait',
    heading: 'Trait',
    minWidth: 200,
    compareFunction: makeStringCompareFunction('trait_original'),
    render: (row: any) => <Cell>{row.trait_original}</Cell>,
  },
  {
    key: 'variant_id',
    heading: 'Variant',
    minWidth: 150,
    compareFunction: makeNumericCompareFunction('pos'),
    render: (row: any) => {
      const variantId = `${row.chr}-${row.pos}-${row.ref}-${row.alt}`
      return (
        <Cell>
          <Link to={`/variant/${variantId}`}>{variantId}</Link>
        </Cell>
      )
    },
  },
  {
    key: 'mlog10p',
    heading: '-log10(p)',
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('mlog10p'),
    render: (row: any) => <NumericCell>{row.mlog10p.toFixed(2)}</NumericCell>,
  },
  {
    key: 'beta',
    heading: 'Beta',
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('beta'),
    render: (row: any) => <NumericCell>{row.beta ? row.beta.toExponential(2) : 'N/A'}</NumericCell>,
  },
  {
    key: 'pip',
    heading: (
      <TooltipAnchor tooltip="Posterior Inclusion Probability">
        {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
        <TooltipHint>PIP</TooltipHint>
      </TooltipAnchor>
    ),
    minWidth: 80,
    compareFunction: makeNumericCompareFunction('pip'),
    render: (row: any) => <NumericCell>{row.pip ? row.pip.toFixed(3) : 'N/A'}</NumericCell>,
  },
  {
    key: 'gene_most_severe',
    heading: 'Gene',
    minWidth: 100,
    compareFunction: makeStringCompareFunction('gene_most_severe'),
    render: (row: any) => (
      <Cell>
        {row.gene_most_severe && (
          <Link to={`/gene/${row.gene_most_severe}`}>{row.gene_most_severe}</Link>
        )}
      </Cell>
    ),
  },
]

export default credibleSetTableColumns
