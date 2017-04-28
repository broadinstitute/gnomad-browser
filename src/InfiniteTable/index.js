/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import R from 'ramda'
import { InfiniteLoader, List } from 'react-virtualized'

import css from './styles.css'

const abstractCellStyle = {
  paddingLeft: 20,
  paddingRight: 20,
  paddingTop: 4,
  paddingBottom: 3,
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
      fontSize: 12,
      backgroundColor: getFilterBackgroundColor(filter),
    }}
  >
    {filter}
  </span>
)

const formatVariantId = (variantId) => {
  let [chrom, pos, ref, alt] = variantId.split('-')
  if (alt.length > 6) {
    alt = `${alt.slice(0,6)}...`
  }
  if (ref.length > 6) {
    ref = `${ref.slice(0,6)}...`
  }
  return (
    <span>
      {chrom}:{pos} {ref} / {alt}
    </span>
  )
}

const getDataCell = (field, dataRow, i) => {
  const { dataKey, dataType, width } = field
  const cellStyle = {
    ...tableCellStyles[dataType],
    width,
  }
  switch (dataType) {
    case 'string':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </div>
      )
    case 'float':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey].toPrecision(3)}
        </div>
      )
    case 'integer':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </div>
      )
    case 'filter':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatFitler(dataRow[dataKey])}
        </div>
      )
    case 'variantId':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatVariantId(dataRow[dataKey])}
        </div>
      )
    default:
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey]}
        </div>
      )
  }
}

const getDataRow = (tableConfig, dataRow, i) => {
  const cells = tableConfig.fields.map((field, i) =>
    getDataCell(field, dataRow, i))
  return (
    <div className={css.row} key={`row-${i}`}>
      <div
        style={{
          ...abstractCellStyle,
          width: 10,
        }}
        key={`cell-index-${i}`}
      >
        {i}
      </div>
      {cells}
    </div>
  )
}

const getHeaderCell = field => (
  <div
    key={`${field.title}-header-cell`}
    style={{
      ...abstractCellStyle,
      marginBottom: 5,
      width: field.width,
      borderBottom: '1px solid #000',
    }}
  >
    {field.title}
  </div>
)


const InfiniteTable = ({
  title,
  width,
  height,
  tableConfig,
  tableData,
  loadMoreRows,
  remoteRowCount,
}) => {
  const headers = tableConfig.fields.map(field => getHeaderCell(field))

  const isRowLoaded = ({ index }) => !!tableData[index + 1000]

  const rowRenderer = ({ key, index, style }) => {
    return (
      <div
        key={key}
        style={style}
      >
        {getDataRow(tableConfig, tableData[index], index)}
      </div>
    )
  }

  return (
    <div className={css.track}>
      <div style={{ width: 1100 }}>
        <h3>{title}</h3>
        <div className={css.headers}>
          <div
            key={`index-header-cell`}
            style={{
              ...abstractCellStyle,
              marginBottom: 5,
              width: 10,
              borderBottom: '1px solid #000',
            }}
          >
            ix
          </div>
          {headers}
        </div>
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={remoteRowCount}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              height={height}
              onRowsRendered={onRowsRendered}
              ref={registerChild}
              rowCount={remoteRowCount}
              rowHeight={30}
              rowRenderer={rowRenderer}
              overscanRowCount={20}
              width={width}
            />
          )}
        </InfiniteLoader>
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
