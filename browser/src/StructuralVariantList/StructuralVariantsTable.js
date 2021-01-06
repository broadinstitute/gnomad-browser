import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import { Grid } from '@gnomad/ui'

import StructuralVariantPropType from './StructuralVariantPropType'
import { getColumns } from './structuralVariantTableColumns'

class StructuralVariantsTable extends PureComponent {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    forwardedRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })])
      .isRequired,
    numRowsRendered: PropTypes.number.isRequired,
    onHoverVariant: PropTypes.func.isRequired,
    rowHeight: PropTypes.number.isRequired,
    variants: PropTypes.arrayOf(StructuralVariantPropType).isRequired,
    width: PropTypes.number.isRequired,
  }

  render() {
    const {
      forwardedRef,
      numRowsRendered,
      onHoverVariant,
      rowHeight,
      variants,
      width,
      ...rest
    } = this.props

    return (
      <Grid
        ref={forwardedRef}
        {...rest}
        columns={getColumns({ includeHomozygoteAC: variants[0].chrom !== 'Y', width })}
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
}

export default React.forwardRef((props, ref) => (
  <StructuralVariantsTable {...props} forwardedRef={ref} />
))
