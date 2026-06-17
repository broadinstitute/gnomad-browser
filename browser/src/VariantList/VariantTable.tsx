import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styled from 'styled-components'

import { Grid } from '@gnomad/ui'

// Recolor the find bar's current-match row (flagged via shouldHighlightRow) to
// the "active" orange so it stands out from the other (yellow) matches.
const TableWrapper = styled.div`
  .grid-row-highlight mark {
    background-color: #ff9800;
    color: #000;
  }
`

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
  const gridRef = useRef<any>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  // The variant the find bar is parked on, highlighted distinctly (orange).
  const [currentMatchVariantId, setCurrentMatchVariantId] = useState<string | null>(null)
  // Bumped after scrolling to a match so its row is centered once it has rendered.
  const [scrollNonce, setScrollNonce] = useState(0)

  // Imperative API used by the find bar (via Variants) to drive the table.
  useImperativeHandle(forwardedRef, () => ({
    scrollToDataRow: (rowIndex: number) => gridRef.current?.scrollToDataRow(rowIndex),
    focusMatch: (rowIndex: number, variantId: string | null) => {
      setCurrentMatchVariantId(variantId)
      gridRef.current?.scrollToDataRow(rowIndex)
      setScrollNonce((nonce) => nonce + 1)
    },
    clearMatch: () => setCurrentMatchVariantId(null),
  }))

  // Center the current match once react-window has rendered its row, scrolling
  // both the table's own scroll area and the page (scrollToDataRow alone only
  // pins the row to the table edge and never scrolls the window).
  useEffect(() => {
    const matchRow = wrapperRef.current?.querySelector('.grid-row-highlight')
    if (matchRow) {
      matchRow.scrollIntoView({ block: 'center' })
    }
  }, [scrollNonce])

  return (
    <TableWrapper ref={wrapperRef}>
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
        ref={gridRef}
        rowKey={(variant) => (variant as any).variant_id}
        shouldHighlightRow={
          highlightedVariantId || currentMatchVariantId
            ? (variant) => {
                const variantId = (variant as any).variant_id
                return variantId === highlightedVariantId || variantId === currentMatchVariantId
              }
            : () => false
        }
        sortKey={sortKey}
        sortOrder={sortOrder}
      />
    </TableWrapper>
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

export default forwardRef<typeof VariantTable, Props>((props, ref) => (
  <MemoizedVariantTable {...props} forwardedRef={ref} />
))
