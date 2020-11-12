import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { Grid } from '@gnomad/ui'

import MitochondrialVariantPropType from './MitochondrialVariantPropType'
import { getColumns } from './mitochondrialVariantTableColumns'

const NoVariants = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  border: 1px dashed gray;
  margin-top: 20px;
  font-size: 20px;
  font-weight: bold;
`

class MitochondrialVariantsTable extends PureComponent {
  static propTypes = {
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
    const { forwardedRef, numRowsRendered, onHoverVariant, variants, width, ...rest } = this.props

    if (variants.length === 0) {
      return <NoVariants>No variants found</NoVariants>
    }

    return (
      <Grid
        ref={forwardedRef}
        {...rest}
        columns={getColumns({ width })}
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
