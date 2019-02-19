import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import styled from 'styled-components'

import {
  actions as variantActions,
  finalFilteredVariants,
  variantSearchQuery,
  variantSortKey,
  variantSortAscending,
} from '@broad/redux-variants'
import { actions as tableActions, currentTableIndex } from '@broad/table'
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
  grid = null

  componentDidUpdate(prevProps) {
    const { rowIndexLastClickedInNavigator } = this.props
    if (rowIndexLastClickedInNavigator !== prevProps.rowIndexLastClickedInNavigator) {
      if (this.grid) {
        this.grid.scrollToDataRow(rowIndexLastClickedInNavigator)
      }
    }
  }

  gridRef = el => {
    this.grid = el
  }

  render() {
    const {
      /* eslint-disable no-shadow */
      highlightText,
      setCurrentTableScrollWindow,
      setFocusedVariant,
      setHoveredVariant,
      setVariantSortKey,
      variants,
      variantSortKey,
      variantSortOrder,
      /* eslint-enable no-shadow */
    } = this.props

    if (variants.size === 0) {
      return <NoVariants height={500}>No variants found</NoVariants>
    }

    return (
      <Grid
        cellData={{ highlightWords: highlightText.split(/\s+/), setFocusedVariant }}
        columns={columns}
        data={variants.toJS()}
        numRowsRendered={20}
        onHoverRow={rowIndex => {
          setHoveredVariant(rowIndex === null ? null : variants.get(rowIndex).get('variant_id'))
        }}
        onRequestSort={setVariantSortKey}
        onVisibleRowsChange={setCurrentTableScrollWindow}
        ref={this.gridRef}
        rowKey={variant => variant.variant_id}
        sortKey={variantSortKey}
        sortOrder={variantSortOrder}
      />
    )
  }
}

VariantTable.propTypes = {
  highlightText: PropTypes.string,
  rowIndexLastClickedInNavigator: PropTypes.number,
  setCurrentTableScrollWindow: PropTypes.func.isRequired,
  setFocusedVariant: PropTypes.func.isRequired,
  setHoveredVariant: PropTypes.func.isRequired,
  setVariantSortKey: PropTypes.func.isRequired,
  variants: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  variantSortKey: PropTypes.string.isRequired,
  variantSortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
}

VariantTable.defaultProps = {
  highlightText: '',
  rowIndexLastClickedInNavigator: null,
}

const mapStateToProps = state => ({
  highlightText: variantSearchQuery(state),
  rowIndexLastClickedInNavigator: currentTableIndex(state),
  variantSortKey: variantSortKey(state),
  variantSortOrder: variantSortAscending(state) ? 'ascending' : 'descending',
  variants: finalFilteredVariants(state),
})

const mapDispatchToProps = dispatch => ({
  setCurrentTableScrollWindow: scrollWindow =>
    dispatch(tableActions.setCurrentTableScrollWindow(scrollWindow)),
  setFocusedVariant: variantId => dispatch(variantActions.setFocusedVariant(variantId)),
  setHoveredVariant: variantId => dispatch(variantActions.setHoveredVariant(variantId)),
  setVariantSortKey: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VariantTable)
