import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { Grid } from '@broad/ui'

const NoVariants = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.height}px;
  border: 1px dashed gray;
  font-size: 20px;
  font-weight: bold;
`

class VariantTable extends PureComponent {
  grid = React.createRef()

  componentDidUpdate(prevProps) {
    const { rowIndexLastClickedInNavigator } = this.props
    if (rowIndexLastClickedInNavigator !== prevProps.rowIndexLastClickedInNavigator) {
      if (this.grid.current) {
        this.grid.current.scrollToDataRow(rowIndexLastClickedInNavigator)
      }
    }
  }

  render() {
    const {
      columns,
      highlightText,
      onVisibleRowsChange,
      onHoverVariant,
      onRequestSort,
      variants,
      sortKey,
      sortOrder,
    } = this.props

    if (variants.length === 0) {
      return <NoVariants height={500}>No variants found</NoVariants>
    }

    return (
      <Grid
        cellData={{ highlightWords: highlightText.split(/\s+/) }}
        columns={columns}
        data={variants}
        numRowsRendered={20}
        onHoverRow={rowIndex => {
          onHoverVariant(rowIndex === null ? null : variants[rowIndex].variant_id)
        }}
        onRequestSort={onRequestSort}
        onVisibleRowsChange={onVisibleRowsChange}
        ref={this.grid}
        rowKey={variant => variant.variant_id}
        sortKey={sortKey}
        sortOrder={sortOrder}
      />
    )
  }
}

VariantTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  highlightText: PropTypes.string,
  onVisibleRowsChange: PropTypes.func,
  onHoverVariant: PropTypes.func,
  onRequestSort: PropTypes.func,
  rowIndexLastClickedInNavigator: PropTypes.number,
  sortKey: PropTypes.string.isRequired,
  sortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
}

VariantTable.defaultProps = {
  highlightText: '',
  onVisibleRowsChange: () => {},
  onHoverVariant: () => {},
  onRequestSort: () => {},
  rowIndexLastClickedInNavigator: null,
}

export default VariantTable
