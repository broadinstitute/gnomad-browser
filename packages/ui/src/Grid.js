import { transparentize } from 'polished'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled, { css } from 'styled-components'

import { SizeMe } from 'react-sizeme'
import { FixedSizeList } from 'react-window'

import { TooltipAnchor } from './tooltip/TooltipAnchor'
import { TooltipHint } from './tooltip/TooltipHint'

const baseRowStyle = css`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  box-sizing: border-box;
  border-top: 1px solid #e0e0e0;
`

const baseCellStyle = css`
  display: flex;
  flex-grow: 0;
  flex-shrink: 0;
  align-items: center;
  box-sizing: border-box;
  width: ${props => props.width}px;
  padding: 0 0.5em;
  outline: none;

  &:focus {
    box-shadow: inset 0 0 0 2px ${transparentize(0.5, '#428bca')};
  }
`

const GridWrapper = styled.div`
  width: 100%;

  .grid-row {
    ${baseRowStyle};

    &.grid-row-stripe {
      background: #fff;
    }

    &.grid-row-highlight {
      box-shadow: inset 0 0 0 1px #000;
    }
  }

  .grid-cell {
    ${baseCellStyle};
  }

  .grid-cell-content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const GridHorizontalViewport = styled.div`
  overflow-x: auto;
`

const HeaderRow = styled.div`
  ${baseRowStyle};
  border-top: none;
  border-bottom: 1px solid #e0e0e0;
`

const ColumnHeader = styled.div`
  ${baseCellStyle};
  padding: 0.25em 20px 0.25em 0.5em;
  background-position: center right;
  background-repeat: no-repeat;
  font-weight: bold;

  &[aria-sort='ascending'] {
    background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjI8Bya2wnINUMopZAQA7');
  }

  &[aria-sort='descending'] {
    background-image: url('data:image/gif;base64,R0lGODlhFQAEAIAAACMtMP///yH5BAEAAAEALAAAAAAVAAQAAAINjB+gC+jP2ptn0WskLQA7');
  }

  &:focus-within {
    box-shadow: inset 0 0 0 2px ${transparentize(0.5, '#428bca')};
  }

  button {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    font: inherit;
    outline: none;
    user-select: none;
  }
`

const HeadingTooltipWrapper = styled.span`
  max-width: 300px;
  line-height: 1.5;
`

export const GridHeadingTooltip = ({ tooltip }) => (
  <HeadingTooltipWrapper>{tooltip}</HeadingTooltipWrapper>
)

GridHeadingTooltip.propTypes = {
  tooltip: PropTypes.string.isRequired,
}

const DataRow = ({
  index: dataRowIndex,
  data: { cellData, columns, columnWidths, data, focusedCell, onMouseEnter, shouldHighlightRow },
  style,
}) => {
  const rowData = data[dataRowIndex]
  const rowIndex = dataRowIndex + 1 // + 1 for header row
  return (
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      aria-rowindex={rowIndex + 1}
      className={`grid-row ${dataRowIndex % 2 === 0 ? 'grid-row-stripe' : ''} ${
        shouldHighlightRow(rowData) ? 'grid-row-highlight' : ''
      }`}
      onMouseEnter={onMouseEnter}
      role="row"
      style={style}
    >
      {columns.map((column, columnIndex) => (
        <div
          key={column.key}
          aria-colindex={columnIndex + 1}
          className="grid-cell"
          data-cell={`${columnIndex},${rowIndex}`}
          role={column.isRowHeader ? 'rowheader' : 'gridcell'}
          tabIndex={
            columnIndex === focusedCell.columnIndex && rowIndex === focusedCell.rowIndex ? 0 : -1
          }
          style={{ width: columnWidths[columnIndex] }}
        >
          {column.render(rowData, column.key, cellData)}
        </div>
      ))}
    </div>
  )
}

DataRow.propTypes = {
  data: PropTypes.shape({
    columnWidths: PropTypes.arrayOf(PropTypes.number.isRequired),
    data: PropTypes.arrayOf(PropTypes.any).isRequired,
    focusedCell: PropTypes.shape({
      columnIndex: PropTypes.number.isRequired,
      rowIndex: PropTypes.number.isRequired,
    }).isRequired,
    onMouseEnter: PropTypes.func.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  style: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
}

export class Grid extends Component {
  static propTypes = {
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        heading: PropTypes.string,
        key: PropTypes.string.isRequired,
        isRowHeader: PropTypes.bool,
        isSortable: PropTypes.bool,
        minWidth: PropTypes.number,
        render: PropTypes.func,
        tooltip: PropTypes.string,
      })
    ).isRequired,
    cellData: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    data: PropTypes.arrayOf(PropTypes.any).isRequired,
    numRowsRendered: PropTypes.number,
    onHoverRow: PropTypes.func,
    onRequestSort: PropTypes.func,
    onScroll: PropTypes.func,
    onVisibleRowsChange: PropTypes.func,
    rowHeight: PropTypes.number,
    rowKey: PropTypes.func,
    shouldHighlightRow: PropTypes.func,
    sortKey: PropTypes.string,
    sortOrder: PropTypes.oneOf(['ascending', 'descending']),
  }

  static defaultProps = {
    cellData: {},
    numRowsRendered: 20,
    onHoverRow: () => {},
    onRequestSort: undefined,
    onScroll: () => {},
    onVisibleRowsChange: () => {},
    rowHeight: 25,
    rowKey: rowData => rowData.key,
    shouldHighlightRow: () => false,
    sortKey: undefined,
    sortOrder: 'ascending',
  }

  focusedCell = { columnIndex: 0, rowIndex: 0 }

  focusedElement = null

  gridElement = React.createRef()

  list = React.createRef()

  // https://www.w3.org/TR/wai-aria-practices/#kbd_roving_tabindex
  onFocus = e => {
    const targetElement = e.target
    if (targetElement === this.gridElement.current) {
      this.moveFocusToCell(this.focusedCell.columnIndex, this.focusedCell.rowIndex)
      return
    }

    const containingCell = targetElement.closest('[data-cell]')
    const [columnIndex, rowIndex] = containingCell.dataset.cell.split(',').map(Number)

    // Place tabindex=0 on the currently focused element, remove it from other elements
    this.gridElement.current.setAttribute('tabindex', -1)
    const previouslyFocusedElement = this.focusedElement
    if (previouslyFocusedElement) {
      previouslyFocusedElement.setAttribute('tabindex', -1)
    }
    targetElement.setAttribute('tabindex', 0)

    this.focusedCell = { columnIndex, rowIndex }
    this.focusedElement = targetElement
  }

  onItemsRendered = ({ visibleStartIndex, visibleStopIndex }) => {
    // If the focused cell is scrolled out of view, place tabindex=0 back on the grid.
    // Since the focused cell's element (the only one with tabindex=0) is destroyed,
    // no element in the grid will be tabbable.
    // After this, onFocus will move focus back to the correct cell when the grid is next focused.
    const focusedDataRowIndex = this.focusedCell.rowIndex - 1
    if (focusedDataRowIndex < visibleStartIndex || focusedDataRowIndex > visibleStopIndex) {
      if (this.focusedElement) {
        this.focusedElement = null
      }
      this.gridElement.current.setAttribute('tabindex', 0)
    }

    const { onVisibleRowsChange } = this.props
    onVisibleRowsChange({
      startIndex: visibleStartIndex,
      stopIndex: visibleStopIndex,
    })
  }

  onMouseEnterRow = e => {
    // -2 because a) aria-rowindex starts at 1 and b) to skip the header row
    const rowIndex = Number(e.currentTarget.getAttribute('aria-rowindex')) - 2
    const { onHoverRow } = this.props
    onHoverRow(rowIndex)
  }

  onKeyDown = e => {
    const { columns, data } = this.props
    const { columnIndex, rowIndex } = this.focusedCell

    const numColumns = columns.length
    const numRows = data.length + 1

    // TODO: Handle more keys
    // See "Keyboard Interaction for Data Grids" https://www.w3.org/TR/wai-aria-practices/#grid
    switch (e.key) {
      case ' ':
        // prevent space key from scrolling
        if (e.target.matches('[data-cell]')) {
          e.preventDefault()
        }
        break
      case 'ArrowUp':
        if (rowIndex > 0) {
          this.moveFocusToCell(columnIndex, rowIndex - 1)
        }
        e.preventDefault() // prevent scroll (handled by moveFocusToCell)
        break
      case 'ArrowDown':
        if (rowIndex < numRows - 1) {
          this.moveFocusToCell(columnIndex, rowIndex + 1)
        }
        e.preventDefault() // prevent scroll (handled by moveFocusToCell)
        break
      case 'ArrowLeft':
        if (columnIndex > 0) {
          this.moveFocusToCell(columnIndex - 1, rowIndex)
        }
        e.preventDefault() // prevent scroll (handled by moveFocusToCell)
        break
      case 'ArrowRight':
        if (columnIndex < numColumns - 1) {
          this.moveFocusToCell(columnIndex + 1, rowIndex)
        }
        e.preventDefault() // prevent scroll (handled by moveFocusToCell)
        break
      default:
    }
  }

  moveFocusToCell(columnIndex, rowIndex) {
    if (rowIndex !== 0) {
      this.list.current.scrollToItem(rowIndex - 1)
    }

    setTimeout(() => {
      // https://www.w3.org/TR/wai-aria-practices/#gridNav_focus
      const cellElement = this.gridElement.current.querySelector(
        `[data-cell="${columnIndex},${rowIndex}"]`
      )

      // Note: supporting widgets that use arrow keys (such as text inputs or select menus)
      // will require changes to the Grid component.
      // See "Editing and Navigating Inside a Cell" https://www.w3.org/TR/wai-aria-practices/#gridNav_focus
      const controlElement = cellElement.querySelector('a, button')
      if (controlElement) {
        controlElement.focus()
      } else {
        cellElement.focus()
      }
    }, 0)
  }

  scrollTo(scrollOffset) {
    this.list.current.scrollTo(scrollOffset)
  }

  scrollToDataRow(dataRowIndex) {
    // Data row indices are off by one from grid row indices since grid row indices include header row
    this.list.current.scrollToItem(dataRowIndex)
  }

  render() {
    const {
      cellData,
      columns: inputColumns,
      data,
      numRowsRendered,
      onHoverRow,
      onRequestSort,
      onScroll,
      onVisibleRowsChange,
      rowHeight,
      rowKey,
      shouldHighlightRow,
      sortKey,
      sortOrder,
      ...rest
    } = this.props

    const columns = inputColumns.map(column => {
      const columnDefaults = {
        grow: 1,
        heading: column.key,
        tooltip: undefined,
        isRowHeader: false,
        isSortable: false,
        minWidth: 100,
        render: rowData => <div className="grid-cell-content">{rowData[column.key]}</div>,
      }

      return { ...columnDefaults, ...column }
    })

    const ariaSortAttr = column => {
      if (!column.isSortable) {
        return undefined
      }
      if (column.key !== sortKey) {
        return 'none'
      }
      return sortOrder
    }

    return (
      <GridWrapper
        {...rest}
        aria-colcount={columns.length}
        aria-rowcount={data.length + 1}
        ref={this.gridElement}
        role="grid"
        tabIndex={0}
        onFocus={this.onFocus}
        onKeyDown={this.onKeyDown}
        onMouseLeave={() => {
          onHoverRow(null)
        }}
      >
        <SizeMe>
          {({ size }) => {
            const availableWidth = size.width
            const minGridWidth = columns.reduce((sum, col) => sum + col.minWidth, 0)
            const remainingWidth = Math.max(availableWidth - minGridWidth, 0)

            const totalGrowFactors = columns.reduce((sum, col) => sum + col.grow, 0) || 1
            const gridWidth = Math.max(availableWidth, minGridWidth)

            const columnWidths = columns.map(
              col => col.minWidth + (col.grow / totalGrowFactors) * remainingWidth
            )

            return (
              <GridHorizontalViewport>
                <HeaderRow aria-rowindex={1} height={rowHeight} role="row">
                  {columns.map((column, columnIndex) => {
                    let content = column.heading
                    if (column.tooltip) {
                      content = <TooltipHint>{content}</TooltipHint>
                    }
                    if (column.isSortable) {
                      content = (
                        <button
                          tabIndex={-1}
                          type="button"
                          onClick={() => onRequestSort(column.key)}
                        >
                          {content}
                        </button>
                      )
                    } else {
                      content = <span>{content}</span>
                    }
                    if (column.tooltip) {
                      content = (
                        <TooltipAnchor
                          tooltip={column.tooltip}
                          tooltipComponent={GridHeadingTooltip}
                        >
                          {content}
                        </TooltipAnchor>
                      )
                    }

                    return (
                      <ColumnHeader
                        key={column.key}
                        aria-colindex={columnIndex + 1}
                        aria-sort={ariaSortAttr(column)}
                        data-cell={`${columnIndex},0`}
                        role="columnheader"
                        tabIndex={-1}
                        width={columnWidths[columnIndex]}
                      >
                        {content}
                      </ColumnHeader>
                    )
                  })}
                </HeaderRow>
                <FixedSizeList
                  // With height = numRowsRendered * rowHeight, when scrolled to an offset
                  // which is an exact multiple of rowHeight, onItemsRendered's stopIndex
                  // will be the index of the row after the last row visible. Subtracting
                  // one pixel from the height prevents this.
                  height={numRowsRendered * rowHeight - 1}
                  itemCount={data.length}
                  itemData={{
                    cellData,
                    columns,
                    columnWidths,
                    data,
                    focusedCell: this.focusedCell,
                    onMouseEnter: this.onMouseEnterRow,
                    shouldHighlightRow,
                  }}
                  itemKey={rowIndex => rowKey(data[rowIndex])}
                  itemSize={rowHeight}
                  overscanCount={10}
                  ref={this.list}
                  style={{
                    overflowX: 'hidden',
                  }}
                  width={gridWidth}
                  onItemsRendered={this.onItemsRendered}
                  onScroll={onScroll}
                >
                  {DataRow}
                </FixedSizeList>
              </GridHorizontalViewport>
            )
          }}
        </SizeMe>
      </GridWrapper>
    )
  }
}
