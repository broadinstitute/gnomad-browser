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
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 4,
  paddingBottom: 3,
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
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
  exponential: {
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
  link: {
    ...normalCellStyles.string,
  },
  datasets: {
    ...normalCellStyles.string,
  },
  consequence: {
    ...normalCellStyles.string,
  },
  alleleFrequency: {
    ...normalCellStyles.float,
  },
  flags: {
    ...normalCellStyles.float,
  },
}

const tableCellStyles = {
  ...normalCellStyles,
  ...specialCellStyles,
}

const datasetConfig = {
  gnomadExomeVariants: { color: 'rgba(70, 130, 180, 0.8)', abbreviation: 'E', border: '1px solid #000' },
  gnomadExomeVariantsFiltered: { color: 'rgba(70, 130, 180, 0.4)', abbreviation: 'E', border: '1px dashed #000' },
  gnomadGenomeVariants: { color: 'rgba(115, 171, 61, 1)', abbreviation: 'G', border: '1px solid #000' },
  gnomadGenomeVariantsFiltered: { color: 'rgba(115, 171, 61, 0.4)', abbreviation: 'G', border: '1px dashed #000' },
  exacVariants: { color: 'rgba(70, 130, 180, 1)', abbreviation: 'ExAC', border: '1px solid #000' },
  exacVariantsFiltered: { color: 'rgba(70, 130, 180, 0.6)', abbreviation: 'ExAC', border: '1px dashed #000' },
}

const datasetTranslation = {
  gnomadExomeVariants: 'exomes_',
  gnomadGenomeVariants: 'genomes_',
}

const formatDatasets = (dataRow, index) => dataRow.datasets.valueSeq().toJS().map((dataset) => {
  const { filters } = dataRow
  let border
  let backgroundColor
  if (
    filters.includes(`${datasetTranslation[dataset]}RF`) ||
    filters.includes(`${datasetTranslation[dataset]}AC0`) ||
    (dataset === 'exacVariants' && filters.size > 0)
  ) {
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
        borderRadius: 3,
        color: 'white',
        marginLeft: 10,
        padding: '1px 4px 1px 4px',
        backgroundColor,
      }}
    >
      {datasetConfig[dataset].abbreviation}
    </span>
  )
})

const flagConfig = {
  lcr: { color: 'gray', abbreviation: 'LCR', border: '1px solid #000' },
  segdup: { color: 'gray', abbreviation: 'SEGDUP', border: '1px solid #000' },
  lof: { color: '#d9534f', abbreviation: 'LC LoF', border: '1px solid #000' },

}

const formatFlags = (dataRow, index) => {
  return ['lcr', 'segdup', 'lof']
    .filter((flag) => {
      return dataRow.get(flag) === true || dataRow.get(flag) === 'LC'
    })
    .map((flag) => {
      return (
        <span
          key={`${flag}${index}`}
          style={{
            border: flagConfig[flag].border,
            borderRadius: 3,
            color: 'white',
            marginLeft: 10,
            padding: '1px 4px 1px 4px',
            backgroundColor: flagConfig[flag].color,
          }}
        >
          {flagConfig[flag].abbreviation}
        </span>
      )
    })
}

const formatFitler = (filters, index) => filters.map(filter => (
  <span
    key={`${filter}${index}`}
    style={{
      color: 'black',
      border: '1px solid #000',
      marginLeft: 10,
      padding: '1px 2px 1px 2px',
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

const VariantId = styled.span`
  ${'' /* font-weight: bold; */}
  color: rgba(70, 130, 180, 1);
  cursor: pointer;
`

const formatVariantId = (variantId, onRowClick, dataRow, searchText) => {
  return (
    <VariantId
      key={`variant-id-${variantId}`}
      // HACK
      onClick={_ => onRowClick(variantId, dataRow.get('datasets').first())}  // eslint-disable-line
    >
      {/* <Highlighter
        searchWords={searchText.split(/\s+/)}
        textToHighlight={variantId}
      /> */}
      {variantId}
    </VariantId>
  )
}

const RowLink = styled.a`
  color: rgba(70, 130, 180, 1);
  cursor: pointer;
  text-decoration: none;
`

const formatLink = (highlightedText, onRowClick, dataRow, searchText) => {
  const text = highlightedText.props.textToHighlight
  return (
    <RowLink
      key={`variant-id-${text}`}
      // HACK
      onClick={_ => onRowClick(text)}  // eslint-disable-line
    >
      {highlightedText}
    </RowLink>
  )
}

const lof = '#DD2C00'
const missense = 'orange'
const synonymous = '#2E7D32'
const other = '#424242'
const consequencePresentation = {
  mis: { name: 'missense', color: missense },
  missense_variant: { name: 'missense', color: missense },
  ns: { name: 'inframe indel', color: missense },
  inframe_insertion: { name: 'inframe insertion', color: missense },
  inframe_deletion: { name: 'inframe deletion', color: missense },
  syn: { name: 'synonymous', color: synonymous },
  synonymous_variant: { name: 'synonymous', color: synonymous },
  upstream_gene_variant: { name: 'upstream gene', color: other },
  downstream_gene_variant: { name: 'downstream gene', color: other },
  intron_variant: { name: 'intron', color: other },
  '3_prime_UTR_variant': { name: "3' UTR", color: other },
  '5_prime_UTR_variant': { name: "5' UTR", color: other },
  splice: { name: 'splice region', color: other },
  splice_region_variant: { name: 'splice region', color: other },
  splice_donor_variant: { name: 'splice donor', color: lof },
  splice_acceptor_variant: { name: 'splice acceptor', color: lof },
  frameshift_variant: { name: 'frameshift', color: lof },
  stop_gained: { name: 'stop gained', color: lof },
  stop_lost: { name: 'stop lost', color: lof },
  start_lost: { name: 'start lost', color: lof },
  lof: { name: 'loss of function', color: lof },
}

const getConsequenceColor = (consequence) => {
  if (!consequence) {
    return 'gray'
  }
  if (consequence in consequencePresentation) {
    return consequencePresentation[consequence].color
  }
  return other
}
const getConsequenceName = (consequence) => {
  if (!consequence) {
    return 'N/A'
  }
  if (consequence in consequencePresentation) {
    return consequencePresentation[consequence].name
  }
  return consequence
}

const formatConsequence = (consequence, index, searchText) => {
  return (
    <span
      style={{
        color: getConsequenceColor(consequence),
        // fontWeight: 'bold',
      }}
      key={`${consequence}-${index}`}
    >
      <Highlighter
        searchWords={searchText.split(/\s+/)}
        textToHighlight={getConsequenceName(consequence)}
      />
    </span>
  )
}

const formatAlleleFrequency = (dataRow, dataKey) => {
  if (dataRow['allele_count'] === 0) {
    return 0
  }
  return Number((dataRow['allele_count'] / dataRow['allele_num']).toPrecision(4)).toExponential()  // eslint-disable-line
}

const formatExponential = (number) => {
  if (number === null) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}


const getDataCell = (field, dataRow, searchText, i, onRowClick) => {
  // if (condition) {
  //
  // }
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
          {/* {dataRow[dataKey] === null ? '' : dataRow[dataKey]} */}
          {cellText}
        </div>
      )
    case 'exponential':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatExponential(cellText)}
        </div>
      )
    case 'float':
      const output = cellText === null ? '' : cellText.toPrecision(3)
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {output}
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
          {formatVariantId(cellText, onRowClick, dataRow, searchText)}
        </div>
      )
    case 'link':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatLink(cellText, onRowClick, dataRow, searchText)}
        </div>
      )
    case 'consequence':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatConsequence(dataRow[dataKey], i, searchText)}
          {/* {dataRow[dataKey]} */}
        </div>
      )
    case 'datasets':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatDatasets(dataRow, i)}
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
    case 'flags':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatFlags(dataRow, i)}
        </div>
      )
    case 'alleleFrequency':
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {formatAlleleFrequency(dataRow)}
        </div>
      )
    default:
      return (
        <div
          style={cellStyle}
          key={`cell-${dataKey}-${i}`}
        >
          {dataRow[dataKey] === null ? '' : dataRow[dataKey]}
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
    background-color: rgba(10, 121, 191, 0.1);
  }
`

const getDataRow = (tableConfig, dataRow, searchText, i, showIndex, onRowClick, onRowHover) => {  // eslint-disable-line

  const cells = tableConfig.fields
    .filter(field => {
      return !field.disappear
    })
    .map((field, i) =>  // eslint-disable-line
      getDataCell(field, dataRow, searchText, i, onRowClick))

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
      width: field.width + 20,
      maxWidth: field.width + 20,
      minWidth: field.width + 20,

    }}
    key={`${field.title}-header-cell`}
  >
    <HeaderButton
      style={{
        cursor: 'pointer',
        ...abstractCellStyle
      }}
      onClick={e => field.onHeaderClick(field.dataKey)}
    >
      {field.title}
    </HeaderButton>
  </HeaderButtonContainer>
)


const headers = tableConfig => tableConfig.fields
  .filter(field => !field.disappear)
  .map(field => getHeaderCell(field))


function getRowData(tableData, rowIndex) {
  if (Array.isArray(tableData)) {
    return tableData[rowIndex]
  }

  if (Immutable.List.isList(tableData)) {
    return tableData.get(rowIndex)
  }

  return undefined
}


function tableRowRenderer (tableConfig, tableData, searchText, showIndex, onRowClick, onRowHover) {
  return function({ key, index, style }) {
    const rowData = getRowData(tableData, index)

    const renderedRowContent = rowData
      ? getDataRow(tableConfig, rowData, searchText, index, showIndex, onRowClick, onRowHover)
      : 'Loading'

    const localStyle = {
      ...style,
      borderTop: '1px solid #E0E0E0',
    }

    return (
      <div
        key={key}
        style={localStyle}
      >
        {renderedRowContent}
      </div>
    )
  }
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

const NoVariants = styled.div`
  display: flex;
  align-items: center;
  height: ${props => props.height}px;
  width: ${props => props.width}px;
  justify-content: center;
  font-weight: bold;
  font-size: 20px;
  border: 1px dashed gray;
  margin-top: 20px;
`

const Table = ({
  title,
  height,
  tableConfig,
  tableData,
  loadMoreRows,
  remoteRowCount,
  overscan,
  showIndex,
  scrollToRow,
  onRowClick,
  onRowHover,
  onScroll,
  searchText,
  width,
  filteredIdList,
}) => {
  if (searchText !== '' && filteredIdList.size === 0) {
    return <NoVariants width={width} height={height}>No variants found</NoVariants>
  }

  const isRowLoaded = ({ index }) => Boolean(getRowData(tableData, index))

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
            width={width}
            scrollToIndex={scrollToRow}
            onScroll={onScroll}
          />
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
  showIndex: false,
  scrollToRow: 0,
  setHoveredVariant: () => { },
  onRowClick: () => {},
  searchText: '',
}

export default Table
