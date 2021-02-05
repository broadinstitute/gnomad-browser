import PropTypes from 'prop-types'
import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

import StructuralVariantPropType from './StructuralVariantPropType'

const StructuralVariantsTable = ({
  columns,
  forwardedRef,
  numRowsRendered,
  onHoverVariant,
  rowHeight,
  variants,
  ...rest
}) => {
  return (
    <Grid
      ref={forwardedRef}
      {...rest}
      columns={columns}
      data={variants}
      numRowsRendered={numRowsRendered}
      onHoverRow={rowIndex => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      rowHeight={rowHeight}
      rowKey={variant => variant.variant_id}
    />
  )
}

StructuralVariantsTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  forwardedRef: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  numRowsRendered: PropTypes.number.isRequired,
  onHoverVariant: PropTypes.func.isRequired,
  rowHeight: PropTypes.number.isRequired,
  variants: PropTypes.arrayOf(StructuralVariantPropType).isRequired,
}

const MemoizedStructuralVariantsTable = memo(StructuralVariantsTable)

export default forwardRef((props, ref) => (
  <MemoizedStructuralVariantsTable {...props} forwardedRef={ref} />
))
