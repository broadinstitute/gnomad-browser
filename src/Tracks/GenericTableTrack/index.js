/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'

import css from './styles.css'

const getHeader = field => <th key={`${field.title}-header-cell`}>{field.title}</th>

const getDataCell = (dataKey, cellDataType, dataRow, i) => {
  switch (cellDataType) {
    case 'string':
      return <td key={`cell-${dataKey}-${i}`}>{dataRow[dataKey]}</td>
    case 'float':
      return <td key={`cell-${dataKey}-${i}`}>{dataRow[dataKey].toPrecision(3)}</td>
    case 'integer':
      return <td key={`cell-${dataKey}-${i}`}>{dataRow[dataKey]}</td>
    default:
      return <td key={`cell-${dataKey}-${i}`}>{dataRow[dataKey]}</td>
  }
}

const getDataRow = (tableConfig, dataRow, i) => {
  const cells = tableConfig.fields.map((field, i) =>
    getDataCell(field.dataKey, field.dataType, dataRow, i))
  return (
    <tr style={{backgroundColor: '#C5CCDC' }}  key={`row-${i}`}>
      {cells}
    </tr>
  )
}

const PositionTableTrack = ({
  title,
  height,
  tableConfig,
  tableData,
}) => {
  const headers = tableConfig.fields.map(field => getHeader(field))
  const rows = tableData.map((rowData, i) => getDataRow(tableConfig, rowData, i))

  return (
    <div className={css.track}>
      <div>
        <h3>{title}</h3>
        <table className={css.genericTableTrack} style={{ width: '100%' }}>
          <thead>
            <tr>
              {headers}
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    </div>
  )
}
PositionTableTrack.propTypes = {
  height: PropTypes.number.isRequired,
  width: PropTypes.number, // eslint-disable-line
  leftPanelWidth: PropTypes.number, // eslint-disable-line
  xScale: PropTypes.func, // eslint-disable-line
  positionOffset: PropTypes.func,  // eslint-disable-line
  tableConfig: PropTypes.object.isRequired,
  tableData: PropTypes.array.isRequired,
}

export default PositionTableTrack
