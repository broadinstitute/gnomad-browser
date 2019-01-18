/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
/* eslint-disable no-unused-vars */

import Immutable from 'immutable'
import PropTypes from 'prop-types'
import React from 'react'
import Highlighter from 'react-highlight-words'
import { withSize } from 'react-sizeme'
import { InfiniteLoader, List } from 'react-virtualized'
import styled from 'styled-components'

import { Badge, TooltipAnchor } from '@broad/ui'
import { getCategoryFromConsequence, getLabelForConsequenceTerm } from '@broad/utilities'

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
  gnomadExomeVariants: { color: 'rgba(70, 130, 180, 0.8)', abbreviation: 'E' },
  gnomadExomeVariantsFiltered: { color: 'rgba(70, 130, 180, 0.4)', abbreviation: 'E' },
  gnomadGenomeVariants: { color: 'rgba(115, 171, 61, 1)', abbreviation: 'G' },
  gnomadGenomeVariantsFiltered: { color: 'rgba(115, 171, 61, 0.4)', abbreviation: 'G' },
  exacVariants: { color: 'rgba(70, 130, 180, 1)', abbreviation: 'ExAC' },
  exacVariantsFiltered: { color: 'rgba(70, 130, 180, 0.6)', abbreviation: 'ExAC' },
}

const filterPrefixes = {
  gnomadExomeVariants: 'exomes_',
  gnomadGenomeVariants: 'genomes_',
  exacVariants: '',
}

const DatasetIcon = styled.span`
  padding: 1px 4px;
  border: 1px ${props => (props.isFiltered ? 'dashed' : 'solid')} #000;
  border-radius: 3px;
  margin-left: 10px;
  background-color: ${props => props.color};
  color: white;
`

const formatDatasets = dataRow => {
  const datasets = dataRow.datasets.valueSeq().toJS()
  return datasets.map(dataset => {
    const datasetFilterPrefix = filterPrefixes[dataset]
    const isFiltered = dataRow.filters.some(f => f.startsWith(datasetFilterPrefix))

    const { abbreviation, color } = isFiltered
      ? datasetConfig[`${dataset}Filtered`]
      : datasetConfig[dataset]

    return (
      <DatasetIcon key={dataset} color={color} isFiltered={isFiltered}>
        {abbreviation}
      </DatasetIcon>
    )
  })
}

const flagProps = {
  lcr: {
    children: 'LCR',
    level: 'info',
    tooltip: 'Found in a low complexity region\nVariant annotation or quality dubious',
  },
  lc_lof: {
    children: 'LC LoF',
    level: 'error',
    tooltip: 'Low-confidence LoF\nVariant annotation or quality dubious',
  },
  lof_flag: {
    children: 'LoF flag',
    level: 'warning',
    tooltip: 'Flagged by LOFTEE\nVariant annotation or quality dubious',
  },
  nc_transcript: {
    children: 'NC Transcript',
    level: 'error',
    tooltip: 'Non-protein-coding transcript\nVariant annotation dubious',
  },
  mnv: {
    children: 'MNV',
    level: 'error',
    tooltip: 'Multi-nucleotide variant\nVariant annotation dubious',
  },
}

const formatFlags = dataRow => {
  const flags = dataRow.get('flags').filter(flag => flag !== 'segdup')
  return flags.map(flag => <Badge key={flag} {...flagProps[flag]} />)
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
      <Highlighter searchWords={searchText.split(/\s+/)} textToHighlight={variantId} />
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

const categoryColors = {
  lof: '#DD2C00',
  missense: 'orange',
  synonymous: '#2E7D32',
  other: '#424242',
}

const getConsequenceColor = consequenceTerm => {
  if (!consequenceTerm) {
    return 'gray'
  }
  const category = getCategoryFromConsequence(consequenceTerm) || 'other'
  return categoryColors[category]
}

const getConsequenceName = consequenceTerm =>
  consequenceTerm ? getLabelForConsequenceTerm(consequenceTerm) : 'N/A'

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

const TextTooltipWrapper = styled.span`
  line-height: 1.5;
  text-align: center;
  white-space: pre-line;
`

const TextTooltip = ({ text }) => <TextTooltipWrapper>{text}</TextTooltipWrapper>

const NonCanonicalMarker = () => (
  <TooltipAnchor text="Consequence is for non-canonical transcript" tooltipComponent={TextTooltip}>
    <span>†</span>
  </TooltipAnchor>
)

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

  let cellText

  if (dataKey === 'hgvs' && dataRow.isCanon === false) {
    cellText = (
      <span>
        <Highlighter
          searchWords={searchText.split(/\s+/)}
          textToHighlight={`${dataRow[dataKey] || ''}`}
        />{' '}
        <NonCanonicalMarker />
      </span>
    )
  } else if (field.searchable) {
    cellText = (
      <Highlighter
        searchWords={searchText.split(/\s+/)}
        textToHighlight={`${dataRow[dataKey] || ''}`}
      />
    )
  } else {
    cellText = dataRow[dataKey]
  }

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
  border: 1px solid #fafafa;
  border-radius: 3px;
  background-color: #fafafa;
  color: rgb(66, 66, 66);
  cursor: pointer;
  font-weight: bold;

  &:hover {
    border: 1px solid #424242;
    background-color: #424242;
    color: #fafafa;
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
    <HeaderButton onClick={e => field.onHeaderClick(field.dataKey)}>{field.title}</HeaderButton>
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

const HeadersContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
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

const TableWrapper = styled.div`
  overflow-x: scroll;
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
  size,
}) => {
  const isRowLoaded = ({ index }) => Boolean(getRowData(tableData, index))

  const rowRenderer = tableRowRenderer(
    tableConfig,
    tableData,
    searchText,
    showIndex,
    onRowClick,
    onRowHover
  )

  return (
    <TableWrapper>
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
              width={tableConfig.width}
              scrollToIndex={scrollToRow}
              onScroll={onScroll}
            />
          )}
        </InfiniteLoader>
      </div>
    </TableWrapper>
  )
}
Table.propTypes = {
  height: PropTypes.number.isRequired,
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
  size: PropTypes.shape({
    width: PropTypes.number.isRequired,
  }),
}
Table.defaultProps = {
  loadMoreRows: () => { },
  overscan: 10,
  showIndex: false,
  scrollToRow: 0,
  setHoveredVariant: () => { },
  onRowClick: () => {},
  searchText: '',
  size: undefined,
}

export default withSize()(Table)
