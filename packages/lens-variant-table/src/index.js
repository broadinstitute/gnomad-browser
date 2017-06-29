/* eslint-disable react/prop-types */
import React, { PropTypes } from 'react'
import R from 'ramda'
import { InfiniteLoader, List } from 'react-virtualized'
import Highlighter from 'react-highlight-words'
import Immutable from 'immutable'

import defaultStyles from './styles.css'

const VariantTable = ({
  css,
  title,
  width,
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
  scrollCallback,
  searchText,
}) => {

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
    if (dataset === 'all') return
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
    let [chrom, pos, ref, alt] = variantId.split('-')
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

  const getDataCell = (field, dataRow, i) => {
    const { dataKey, dataType, width } = field
    const cellStyle = {
      ...tableCellStyles[dataType],
      width,
      maxWidth: width,
      minWidth: width,
    }
    const cellText = field.searchable ? (
      <Highlighter
        highlightClassName={css.highlight}
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

  const getDataRow = (tableConfig, dataRow, i, showIndex) => {
    const cells = tableConfig.fields.map((field, i) =>
      getDataCell(field, dataRow, i))

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
    const style = {}
    return (
      <div
        className={css.row}
        style={style}
        onClick={e => onRowClick(dataRow['variant_id'])}
        onMouseEnter={e => onRowClick(dataRow['variant_id'])}
        key={`row-${i}`}
      >
        {showIndex && indexCell}
        {cells}
      </div>
    )
  }

  const getHeaderCell = field => (
    <div
      style={{
        width: field.width + 40,
        maxWidth: field.width + 40,
        minWidth: field.width + 40,
      }}
      className={css.headerButtonContainer}
      key={`${field.title}-header-cell`}
    >
      <button
        className={css.headerButton}
        style={{
          ...abstractCellStyle
        }}
        onClick={e => field.onHeaderClick(field.dataKey)}
      >
        {field.title}
      </button>
    </div>
  )


  const headers = tableConfig.fields.map(field => getHeaderCell(field))

  const isRowLoaded = ({ index }) => {
    return !!tableData[index + loadLookAhead]
  }

  const rowRenderer = ({ key, index, style }) => {
    scrollCallback(index)
    let row
    if (Array.isArray(tableData)) {
      row = getDataRow(tableConfig, tableData[index], index, showIndex)
    }
    if (Immutable.List.isList(tableData)) {
      row = getDataRow(tableConfig, tableData.get(index), index, showIndex)
    }


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

  const getDefaultWidth = (tableConfig)  => {
    const scrollBarWidth = 40
    const paddingWidth = tableConfig.fields.length * 40
    const cellContentWidth = tableConfig.fields.reduce((acc, field) =>
      acc + field.width, 0)
    const calculatedWidth = scrollBarWidth + paddingWidth + cellContentWidth
    return calculatedWidth
  }

  return (
    <div className={css.variantTable}>
      <div style={{ width }}>
        <h3>{title}</h3>
        <div className={css.headers}>
          {showIndex && indexHeader}
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
              rowHeight={25}
              rowRenderer={rowRenderer}
              overscanRowCount={overscan}
              width={width || getDefaultWidth(tableConfig) }
              scrollToIndex={scrollToRow}
            />
          )}
        </InfiniteLoader>
      </div>
    </div>
  )
}
VariantTable.propTypes = {
  css: PropTypes.object,
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
  // onRowHover: PropTypin ines.func,
  scrollCallback: PropTypes.func,
  searchText: PropTypes.string,
}
VariantTable.defaultProps = {
  css: defaultStyles,
  width: null,
  loadMoreRows: () => { },
  overscan: 100,
  loadLookAhead: 0,
  showIndex: false,
  scrollToRow: 10,
  setCurrentVariant: () => { },
  scrollCallback: () => {},
  onRowClick: () => {},
  searchText: '',
}

export default VariantTable
