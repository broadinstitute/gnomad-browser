import React, { memo } from 'react'

import { Grid } from '@gnomad/ui'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'

type Props = {
  columns: any[]
  forwardedRef:
    | ((...args: any[]) => any)
    | {
        current?: any
      }
  highlightText: string
  numRowsRendered: number
  onHoverVariant: (...args: any[]) => any
  // @ts-expect-error TS(2749) FIXME: 'MitochondrialVariantPropType' refers to a value, ... Remove this comment to see the full error message
  variants: MitochondrialVariantPropType[]
}

const MitochondrialVariantsTable = ({
  columns,
  forwardedRef,
  highlightText,
  numRowsRendered,
  onHoverVariant,
  variants,
  ...rest
}: Props) => {
  return (
    <Grid
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      ref={forwardedRef}
      {...rest}
      cellData={{
        highlightWords: highlightText.split(',').map((s) => s.trim()),
      }}
      columns={columns}
      data={variants}
      numRowsRendered={numRowsRendered}
      onHoverRow={(rowIndex) => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      rowKey={(variant) => variant.variant_id}
    />
  )
}

const MemoizedMitochondrialVariantsTable = memo(MitochondrialVariantsTable)

export default React.forwardRef((props, ref) => (
  // @ts-expect-error TS(2322) FIXME: Type 'ForwardedRef<unknown>' is not assignable to ... Remove this comment to see the full error message
  <MemoizedMitochondrialVariantsTable {...props} forwardedRef={ref} />
))
