import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import { Grid } from '@gnomad/ui'

class VariantTable extends PureComponent {
  static propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    highlightText: PropTypes.string,
    highlightedVariantId: PropTypes.string,
    onVisibleRowsChange: PropTypes.func,
    onHoverVariant: PropTypes.func,
    onRequestSort: PropTypes.func,
    rowIndexLastClickedInNavigator: PropTypes.number,
    sortKey: PropTypes.string.isRequired,
    sortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
  }

  static defaultProps = {
    highlightText: '',
    highlightedVariantId: null,
    onVisibleRowsChange: () => {},
    onHoverVariant: () => {},
    onRequestSort: () => {},
    rowIndexLastClickedInNavigator: null,
  }

  constructor(props) {
    super(props)

    this.grid = React.createRef()
  }

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
      highlightedVariantId,
      onVisibleRowsChange,
      onHoverVariant,
      onRequestSort,
      variants,
      sortKey,
      sortOrder,
    } = this.props

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
        ref={this.grid}
        rowKey={variant => variant.variant_id}
        shouldHighlightRow={
          highlightedVariantId
            ? variant => variant.variant_id === highlightedVariantId
            : () => false
        }
        sortKey={sortKey}
        sortOrder={sortOrder}
      />
    )
  }
}

export default VariantTable
