/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import R from 'ramda'
import { InfiniteLoader, List } from 'react-virtualized'

import css from './styles.css'

const getHeader = field => <th key={`${field.title}-header-cell`}>{field.title}</th>

const abstractCellStyle = {
  paddingLeft: 20,
  paddingRight: 20,
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
}

const tableCellStyles = {
  ...normalCellStyles,
  ...specialCellStyles,
}

const getFilterBackgroundColor = (filter) => {
  switch (filter) {
    case 'PASS':
      return '#85C77D'
    default:
      return '#F1FF87'
  }
}
const formatFitler = filters => filters.split('|').map(filter =>
  <span
    style={{
      border: '1px solid #000',
      marginLeft: 10,
      padding: '1px 2px 1px 2px',
      backgroundColor: getFilterBackgroundColor(filter),
    }}
  >
    {filter}
  </span>
)

const getDataCell = (dataKey, cellDataType, dataRow, i) => {
  switch (cellDataType) {
    case 'string':
      return (
        <td
          style={tableCellStyles[cellDataType]}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </td>
      )
    case 'float':
      return (
        <td
          style={tableCellStyles[cellDataType]}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey].toPrecision(3)}
        </td>
      )
    case 'integer':
      return (
        <td
          style={tableCellStyles[cellDataType]}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </td>
      )
    case 'filter':
      return (
        <td
          style={tableCellStyles[cellDataType]}
          key={`cell-${dataKey}-${i}`}
        >
          {formatFitler(dataRow[dataKey])}
        </td>
      )
    default:
      return (
        <td
          style={tableCellStyles[cellDataType]}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </td>
      )
  }
}

const getDataRow = (tableConfig, dataRow, i) => {
  const cells = tableConfig.fields.map((field, i) =>
    getDataCell(field.dataKey, field.dataType, dataRow, i))
  return (
    <tr style={{ backgroundColor: '#e0e0e0' }} key={`row-${i}`}>
      {cells}
    </tr>
  )
}

const InfiniteTable = ({
  title,
  width,
  height,
  tableConfig,
  tableData,
  loadMoreRows,
}) => {
  const headers = tableConfig.fields.map(field => getHeader(field))
  const rows = tableData.map((rowData, i) => getDataRow(tableConfig, rowData, i))

  const remoteRowCount = 2500

  const variantIdList = R.pluck('variant_id', tableData)

  const isRowLoaded = ({ index }) => !!variantIdList[index + 1000]

  const rowRenderer = ({ key, index, style }) => {
    return (
      <div
        key={key}
        style={style}
      >
        {variantIdList[index]}
      </div>
    )
  }

  return (
    <div className={css.track}>
      <div style={{ width: 1100 }}>
        <h3>{title}</h3>
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={remoteRowCount}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              height={500}
              onRowsRendered={onRowsRendered}
              ref={registerChild}
              rowCount={remoteRowCount}
              rowHeight={20}
              rowRenderer={rowRenderer}
              overscanRowCount={1000}
              width={300}
            />
          )}
        </InfiniteLoader>
        {/*<table
          className={css.genericTableTrack}
          style={{
            width,
            height,
          }}
        >
          <thead>
            <tr>
              {headers}
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>*/}
      </div>
    </div>
  )
}
InfiniteTable.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  tableConfig: PropTypes.object.isRequired,
  tableData: PropTypes.array.isRequired,
  loadMoreRows: PropTypes.func.isRequired,
}

export default InfiniteTable
