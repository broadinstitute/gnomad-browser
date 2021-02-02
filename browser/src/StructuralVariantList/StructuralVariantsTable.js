import PropTypes from 'prop-types'
import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

import StructuralVariantPropType from './StructuralVariantPropType'
import { getColumns } from './structuralVariantTableColumns'

const StructuralVariantsTable = ({
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
      columns={getColumns({ includeHomozygoteAC: variants[0].chrom !== 'Y' })}
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
