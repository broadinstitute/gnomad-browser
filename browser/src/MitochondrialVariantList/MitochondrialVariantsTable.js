import PropTypes from 'prop-types'
import React, { memo } from 'react'

import { Grid } from '@gnomad/ui'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'
import { getColumns } from './mitochondrialVariantTableColumns'

const MitochondrialVariantsTable = ({
  context,
  forwardedRef,
  highlightText,
  numRowsRendered,
  onHoverVariant,
  variants,
  width,
  ...rest
}) => {
  return (
    <Grid
      ref={forwardedRef}
      {...rest}
      cellData={{
        highlightWords: highlightText.split(',').map(s => s.trim()),
      }}
      columns={getColumns({ context, width })}
      data={variants}
      numRowsRendered={numRowsRendered}
      onHoverRow={rowIndex => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      rowKey={variant => variant.variant_id}
    />
  )
}

MitochondrialVariantsTable.propTypes = {
  context: PropTypes.oneOf(['gene', 'region', 'transcript']).isRequired,
  forwardedRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }), // eslint-disable-line react/forbid-prop-types
  ]).isRequired,
  highlightText: PropTypes.string.isRequired,
  numRowsRendered: PropTypes.number.isRequired,
  onHoverVariant: PropTypes.func.isRequired,
  variants: PropTypes.arrayOf(MitochondrialVariantPropType).isRequired,
  width: PropTypes.number.isRequired,
}

const MemoizedMitochondrialVariantsTable = memo(MitochondrialVariantsTable)

export default React.forwardRef((props, ref) => (
  <MemoizedMitochondrialVariantsTable {...props} forwardedRef={ref} />
))
