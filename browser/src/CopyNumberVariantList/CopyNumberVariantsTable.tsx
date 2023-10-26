import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

type Props = {
  columns: any[]
  forwardedRef:
    | ((...args: any[]) => any)
    | {
        current?: any
      }
  numRowsRendered: number
  onHoverVariant: (...args: any[]) => any
  rowHeight: number
  variants: CopyNumberVariant[]
}

const CopyNumberVariantsTable = ({
  columns,
  forwardedRef,
  numRowsRendered,
  onHoverVariant,
  rowHeight,
  variants,
  ...rest
}: Props) => {
  return (
    <Grid
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      ref={forwardedRef}
      {...rest}
      columns={columns}
      data={variants}
      numRowsRendered={numRowsRendered}
      onHoverRow={(rowIndex) => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      rowHeight={rowHeight}
      rowKey={(variant) => variant.variant_id}
    />
  )
}

const MemoizedCopyNumberVariantsTable = memo(CopyNumberVariantsTable)

export default forwardRef((props, ref) => (
  // @ts-expect-error TS(2739) FIXME: Type '{ forwardedRef: ForwardedRef<unknown>; }' is... Remove this comment to see the full error message
  <MemoizedCopyNumberVariantsTable {...props} forwardedRef={ref} />
))
