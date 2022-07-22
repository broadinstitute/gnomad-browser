import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

type OwnProps = {
  columns: any[]
  forwardedRef: any
  highlightText?: string
  highlightedVariantId?: string
  onVisibleRowsChange?: (...args: any[]) => any
  onHoverVariant?: (...args: any[]) => any
  onRequestSort?: (...args: any[]) => any
  sortKey: string
  sortOrder: 'ascending' | 'descending'
  variants: any[]
}

// @ts-expect-error TS(2456) FIXME: Type alias 'Props' circularly references itself.
type Props = OwnProps & typeof VariantTable.defaultProps

// @ts-expect-error TS(7022) FIXME: 'VariantTable' implicitly has type 'any' because i... Remove this comment to see the full error message
const VariantTable = ({
  columns,
  forwardedRef,
  highlightText,
  highlightedVariantId,
  onVisibleRowsChange,
  onHoverVariant,
  onRequestSort,
  variants,
  sortKey,
  sortOrder,
}: Props) => {
  return (
    <Grid
      cellData={{ highlightWords: highlightText.split(',').map((s: any) => s.trim()) }}
      columns={columns}
      data={variants}
      numRowsRendered={20}
      onHoverRow={(rowIndex) => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      onRequestSort={onRequestSort}
      onVisibleRowsChange={onVisibleRowsChange}
      ref={forwardedRef}
      rowKey={(variant) => (variant as any).variant_id}
      shouldHighlightRow={
        highlightedVariantId
          ? (variant) => (variant as any).variant_id === highlightedVariantId
          : () => false
      }
      sortKey={sortKey}
      sortOrder={sortOrder}
    />
  )
}

VariantTable.defaultProps = {
  highlightText: '',
  highlightedVariantId: null,
  onVisibleRowsChange: () => {},
  onHoverVariant: () => {},
  onRequestSort: () => {},
}

const MemoizedVariantTable = memo(VariantTable)

export default forwardRef((props, ref) => <MemoizedVariantTable {...props} forwardedRef={ref} />)
