import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { Grid } from '@broad/ui'

import columns from './variantTableColumns'

const NoVariants = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.height}px;
  border: 1px dashed gray;
  margin-top: 20px;
  font-size: 20px;
  font-weight: bold;
`

class VariantTable extends Component {
  static propTypes = {
    highlightText: PropTypes.string,
    onClickVariant: PropTypes.func.isRequired,
    onHoverVariant: PropTypes.func.isRequired,
    onRequestSort: PropTypes.func.isRequired,
    onVisibleRowsChange: PropTypes.func.isRequired,
    rowIndexLastClickedInNavigator: PropTypes.number,
    sortKey: PropTypes.string.isRequired,
    sortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  static defaultProps = {
    highlightText: '',
    rowIndexLastClickedInNavigator: null,
  }

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
      highlightText,
      onClickVariant,
      onHoverVariant,
      onRequestSort,
      onVisibleRowsChange,
      sortKey,
      sortOrder,
      variants,
    } = this.props

    if (variants.length === 0) {
      return <NoVariants height={500}>No variants found</NoVariants>
    }

    return (
      <Grid
        cellData={{ highlightWords: highlightText.split(/\s+/), onClickVariant }}
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

export default VariantTable
