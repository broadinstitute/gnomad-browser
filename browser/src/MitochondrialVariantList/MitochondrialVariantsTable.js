import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import { Grid } from '@gnomad/ui'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'
import { getColumns } from './mitochondrialVariantTableColumns'

class MitochondrialVariantsTable extends PureComponent {
  static propTypes = {
    context: PropTypes.oneOf(['gene', 'region', 'transcript']).isRequired,
    forwardedRef: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.shape({ current: PropTypes.any }), // eslint-disable-line react/forbid-prop-types
    ]).isRequired,
    numRowsRendered: PropTypes.number.isRequired,
    onHoverVariant: PropTypes.func.isRequired,
    variants: PropTypes.arrayOf(MitochondrialVariantPropType).isRequired,
    width: PropTypes.number.isRequired,
  }

  render() {
    const {
      context,
      forwardedRef,
      numRowsRendered,
      onHoverVariant,
      variants,
      width,
      ...rest
    } = this.props

    return (
      <Grid
        ref={forwardedRef}
        {...rest}
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
}

export default React.forwardRef((props, ref) => (
  <MitochondrialVariantsTable {...props} forwardedRef={ref} />
))
