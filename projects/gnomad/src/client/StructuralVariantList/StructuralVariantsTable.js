import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { Grid } from '@broad/ui'

import StructuralVariantPropType from './StructuralVariantPropType'
import { getColumns } from './structuralVariantTableColumns'

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

class StructuralVariantsTable extends PureComponent {
  static propTypes = {
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

    if (variants.length === 0) {
      return <NoVariants>No variants found</NoVariants>
    }

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
