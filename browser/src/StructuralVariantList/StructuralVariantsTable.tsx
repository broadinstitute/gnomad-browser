import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

import StructuralVariantPropType from './StructuralVariantPropType'

type Props = {
  columns: any[]
  forwardedRef: any
  numRowsRendered: number
  onHoverVariant: (...args: any[]) => any
  rowHeight: number
  variants: StructuralVariantPropType[]
}

const StructuralVariantsTable = ({
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

const MemoizedStructuralVariantsTable = memo(StructuralVariantsTable)

export default forwardRef((props, ref) => (
  // @ts-expect-error TS(2739) FIXME: Type '{ forwardedRef: ForwardedRef<unknown>; }' is... Remove this comment to see the full error message
  <MemoizedStructuralVariantsTable {...props} forwardedRef={ref} />
))
