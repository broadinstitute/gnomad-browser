import PropTypes from 'prop-types'
import React, { forwardRef, memo } from 'react'

import { Grid } from '@gnomad/ui'

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
}) => {
  return (
    <Grid
      cellData={{ highlightWords: highlightText.split(',').map(s => s.trim()) }}
      columns={columns}
      data={variants}
      numRowsRendered={20}
      onHoverRow={rowIndex => {
        onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
      }}
      onRequestSort={onRequestSort}
      onVisibleRowsChange={onVisibleRowsChange}
      ref={forwardedRef}
      rowKey={variant => variant.variant_id}
      shouldHighlightRow={
        highlightedVariantId ? variant => variant.variant_id === highlightedVariantId : () => false
      }
      sortKey={sortKey}
      sortOrder={sortOrder}
    />
  )
}

VariantTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  forwardedRef: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  highlightText: PropTypes.string,
  highlightedVariantId: PropTypes.string,
  onVisibleRowsChange: PropTypes.func,
  onHoverVariant: PropTypes.func,
  onRequestSort: PropTypes.func,
  sortKey: PropTypes.string.isRequired,
  sortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
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
