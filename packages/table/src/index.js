/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */

import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { InfiniteLoader, List, AutoSizer } from 'react-virtualized'
import Highlighter from 'react-highlight-words'
import Immutable from 'immutable'

const abstractCellStyle = {
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 4,
  paddingBottom: 3,
  overflow: 'hidden',
  // border: '1px solid blue',
}

const normalCellStyles = {
  string: {
    ...abstractCellStyle,
  },
  integer: {
    ...abstractCellStyle,
  },
  float: {
    ...abstractCellStyle,
  },
}

const specialCellStyles = {
  filter: {
    ...normalCellStyles.string,
  },
  variantId: {
    ...normalCellStyles.string,
  },
  datasets: {
    ...normalCellStyles.string,
  },
}

const tableCellStyles = {
  ...normalCellStyles,
  ...specialCellStyles,
}

const datasetConfig = {
  exome: { color: 'rgba(70, 130, 180, 0.9)', abbreviation: 'E', border: '1px solid #000' },
  exomeFiltered: { color: 'rgba(70, 130, 180, 0.4)', abbreviation: 'E', border: '1px dashed #000' },
  genome: { color: 'rgba(115, 171, 61, 1)', abbreviation: 'G', border: '1px solid #000' },
  genomeFiltered: { color: 'rgba(115, 171, 61, 0.4)', abbreviation: 'G', border: '1px dashed #000' },
}
const formatDatasets = (dataRow, index) => dataRow.datasets.map((dataset) => {
  // eslint-disable-next-line
  if (dataset === 'all') return // TODO return something proper
  const { filter } = dataRow[dataset]
  let border
  let backgroundColor
  if (filter !== 'PASS') {
    border = datasetConfig[`${dataset}Filtered`].border
    backgroundColor = datasetConfig[`${dataset}Filtered`].color
  } else {
    border = datasetConfig[dataset].border
    backgroundColor = datasetConfig[dataset].color
  }
  // eslint-disable-next-line
  return (
    <span
      key={`${dataset}${index}`}
      style={{
        border,
        marginLeft: 10,
        padding: '1px 4px 1px 4px',
        backgroundColor,
      }}
    >
      {datasetConfig[dataset].abbreviation}
    </span>
  )
})

const getFilterBackgroundColor = (filter) => {
  switch (filter) {
    case 'PASS':
      return '#85C77D'
    default:
      return '#F1FF87'
  }
}
const formatFitler = (filters, index) => filters.split('|').map(filter => (
  <span
    key={`${filter}${index}`}
    style={{
      color: 'black',
      border: '1px solid #000',
      marginLeft: 10,
      padding: '1px 2px 1px 2px',
      backgroundColor: getFilterBackgroundColor(filter),
    }}
  >
    {filter}
  </span>
))

const formatLoF = (lofs, index) => lofs.map(lof => (
  <span
    key={`${lof.annotation}${index}`}
    style={{
      border: '1px solid #000',
      marginLeft: 10,
      padding: '1px 2px 1px 2px',
      // backgroundColor: ,
    }}
  >
    {lof.annotation || ''}
  </span>
))

const formatVariantId = (variantId) => {
  let [chrom, pos, ref, alt] = variantId.split('-')  // eslint-disable-line
  if (alt.length > 6) {
    alt = `${alt.slice(0, 6)}...`
  }
  if (ref.length > 6) {
    ref = `${ref.slice(0, 6)}...`
  }
  return (
    <span key={`variant-id-${variantId}`}>
      {chrom}:{pos} {ref} / {alt}
    </span>
  )
}

const getDataCell = (field, dataRow, searchText, i) => {
  const { dataKey, dataType, width } = field
  const cellStyle = {
    ...tableCellStyles[dataType],
    width,
    maxWidth: width,
    minWidth: width,
  }
  const cellText = field.searchable ? (
    <Highlighter
      searchWords={searchText.split(/\s+/)}
      textToHighlight={`${dataRow[dataKey]}`}
    />
  ) : dataRow[dataKey]

  switch (dataType) {
    case 'string':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {cellText}
        </div>
      )
    case 'float':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {cellText.toPrecision(3)}
        </div>
      )
    case 'integer':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {cellText}
        </div>
      )
    case 'filter':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatFitler(cellText, i)}
        </div>
      )
    case 'variantId':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatVariantId(cellText)}
        </div>
      )
    case 'datasets':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatDatasets(dataRow)}
        </div>
      )
    case 'lof':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatLoF(dataRow)}
        </div>
      )
    default:
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {cellText}
        </div>
      )
  }
}

const TableRow = styled.div`
  display: flex;
  height: 100%;
  background-color: ${({ rowIndex, alternatingColors: [c1, c2] }) =>
    (rowIndex % 2 === 0 ? c1 : c2)};
  &:hover {
    ${'' /* background-color: rgba(115, 171, 61,  0.1); */}
    background-color: rgba(10, 121, 191, 0.1);
    cursor: pointer;
  }
`

const getDataRow = (tableConfig, dataRow, searchText, i, showIndex, onRowClick, onRowHover) => {  // eslint-disable-line
  const cells = tableConfig.fields.map((field, i) =>  // eslint-disable-line
    getDataCell(field, dataRow, searchText, i))

  const indexCell = (
    <div
      style={{
        ...abstractCellStyle,
        width: 10,
      }}
      key={`cell-index-${i}`}
    >
      {i}
    </div>
  )
  const rowBackground = i % 2 === 0 ? 'white' : '#F5F5F5'
  return (
    // eslint-disable-next-line
    <TableRow
      onClick={_ => onRowClick(dataRow.get('variant_id'))}  // eslint-disable-line
      onMouseEnter={_ => onRowHover(dataRow.get('variant_id'))}  // eslint-disable-line
      key={`row-${i}`}
      alternatingColors={['white', '#F5F5F5']}
      rowIndex={i}
    >
      {showIndex && indexCell}
      {cells}
    </TableRow>
  )
}

const HeaderButtonContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  width: 100%;
  margin-bottom: 5px;

`

const HeaderButton = styled.button`
  border-radius: 3px;
  font-weight: bold;
  color: rgb(66, 66, 66);
  background-color: #FAFAFA;
  border: 1px solid #FAFAFA;
  &:hover {
    color: #FAFAFA;
    background-color: rgb(66, 66, 66);
    border: 1px solid rgb(66, 66, 66);
  }
`

const getHeaderCell = field => (
  <HeaderButtonContainer
    style={{
      width: field.width + 40,
      maxWidth: field.width + 40,
      minWidth: field.width + 40,
    }}
    key={`${field.title}-header-cell`}
  >
    <HeaderButton
      style={{
        ...abstractCellStyle
      }}
      onClick={e => field.onHeaderClick(field.dataKey)}
    >
      {field.title}
    </HeaderButton>
  </HeaderButtonContainer>
)


const headers = tableConfig => tableConfig.fields.map(field => getHeaderCell(field))

const isRowLoaded = (tableData, loadLookAhead) => ({ index }) => {
  return !!tableData[index + loadLookAhead]
}

const tableRowRenderer = (tableConfig, tableData, searchText, showIndex, onRowClick, onRowHover) =>
  ({ key, index, style }) => {
    let tData
    if (Array.isArray(tableData)) tData = tableData[index]
    else if (Immutable.List.isList(tableData)) {
      tData = tableData.get(index)
    }
    const row = getDataRow(tableConfig, tData, searchText, index, showIndex, onRowClick, onRowHover)
    const localStyle = {
      ...style,
      borderTop: '1px solid #E0E0E0',
    }
    return (
      <div
        key={key}
        style={localStyle}
      >
        {row}
      </div>
    )
  }

const indexHeader = (
  <div
    key={'index-header-cell'}
    style={{
      ...abstractCellStyle,
      marginBottom: 5,
      width: 10,
      borderBottom: '1px solid #000',
    }}
  >
    ix
  </div>
)

const getDefaultWidth = (tableConfig) => {
  const scrollBarWidth = 40
  const paddingWidth = tableConfig.fields.length * 40
  const cellContentWidth = tableConfig.fields.reduce((acc, field) =>
    acc + field.width, 0)
  const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth
  return calculatedWidth
}

const HeadersContainer = styled.div`
  display: flex;
  flex-direction: row;
  font-weight: bold;
`

const TableHeaders = ({ title, tableConfig, showIndex }) => (
  <div>
    <h3>{title}</h3>
    <HeadersContainer>
      {showIndex && indexHeader}
      {headers(tableConfig)}
    </HeadersContainer>
  </div>
)

const Table = ({
  title,
  height,
  tableConfig,
  tableData,
  loadLookAhead,
  loadMoreRows,
  remoteRowCount,
  overscan,
  showIndex,
  scrollToRow,
  onRowClick,
  onRowHover,
  onScroll,
  searchText,
}) => {
  const isRowTableLoaded = isRowLoaded(tableData, loadLookAhead)

  const rowRenderer = tableRowRenderer(
    tableConfig,
    tableData,
    searchText,
    showIndex,
    onRowClick,
    onRowHover
  )

  const defaultWidth = getDefaultWidth(tableConfig)
  return (
    <div>
      <TableHeaders title={title} tableConfig={tableConfig} showIndex={showIndex} />
      <InfiniteLoader
        isRowLoaded={isRowTableLoaded}
        loadMoreRows={loadMoreRows}
        rowCount={remoteRowCount}
      >
        {({ onRowsRendered, registerChild }) => (
          <AutoSizer disableHeight>
            {({ width }) => {
              return (
                <List
                  height={height}
                  onRowsRendered={onRowsRendered}
                  ref={registerChild}
                  rowCount={remoteRowCount}
                  rowHeight={25}
                  rowRenderer={rowRenderer}
                  overscanRowCount={overscan}
                  width={defaultWidth}
                  scrollToIndex={scrollToRow}
                  onScroll={onScroll}
                />
              )
            }}
          </AutoSizer>
        )}
      </InfiniteLoader>
    </div>
  )
}
Table.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  tableConfig: PropTypes.object.isRequired,
  tableData: PropTypes.any.isRequired,
  remoteRowCount: PropTypes.number.isRequired,
  loadMoreRows: PropTypes.func,
  overscan: PropTypes.number,
  showIndex: PropTypes.bool,
  scrollToRow: PropTypes.number,
  onRowClick: PropTypes.func,
  // onRowHover: PropTypes.func,
  searchText: PropTypes.string,
}
Table.defaultProps = {
  width: null,
  loadMoreRows: () => { },
  overscan: 10,
  loadLookAhead: 0,
  showIndex: false,
  scrollToRow: 200,
  setHoveredVariant: () => { },
  onRowClick: () => {},
  searchText: '',
}

export default Table
