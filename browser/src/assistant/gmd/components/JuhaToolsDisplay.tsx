import React, { forwardRef, memo, useState } from 'react'
import styled from 'styled-components'
import { Grid } from '@gnomad/ui'
import credibleSetTableColumns from './credibleSetTableColumns'
import colocalizationTableColumns from './colocalizationTableColumns'
import geneDiseaseTableColumns from './geneDiseaseTableColumns'
import VariantLoading from './VariantLoading' // Re-using for now, can be specialized

const DisplayWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 10px 0;
  margin-bottom: 20px;
`

const ErrorMessage = styled.div`
  padding: 20px;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
  color: #c62828;
`

const NoResultsMessage = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #666;
  text-align: center;
`

const TableContainer = styled.div`
  height: 500px;
  min-height: 500px;
  margin-bottom: 40px;
  position: relative;
`

// CredibleSetTable Component
const CredibleSetTable = memo(
  forwardRef((props: any, ref) => {
    const { columns, variants, sortKey, sortOrder, onRequestSort, ...rest } = props
    return (
      <Grid
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
        ref={ref}
        {...rest}
        columns={columns}
        data={variants}
        numRowsRendered={20}
        rowHeight={25}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onRequestSort={onRequestSort}
        rowKey={(variant: any) => `${variant.cs_id}-${variant.chr}-${variant.pos}-${variant.ref}-${variant.alt}-${variant.resource}-${variant.data_type}`}
      />
    )
  })
)

CredibleSetTable.displayName = 'CredibleSetTable'

// ColocalizationTable Component
const ColocalizationTable = memo(
  forwardRef((props: any, ref) => {
    const { columns, variants, sortKey, sortOrder, onRequestSort, ...rest } = props
    return (
      <Grid
        // @ts-expect-error TS(2769) FIXME: No overload matches this call.
        ref={ref}
        {...rest}
        columns={columns}
        data={variants}
        numRowsRendered={20}
        rowHeight={25}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onRequestSort={onRequestSort}
        rowKey={(variant: any) => `${variant.cs1_id}-${variant.cs2_id}-${variant.chr}`}
      />
    )
  })
)

ColocalizationTable.displayName = 'ColocalizationTable'

// GeneDiseaseTable Component
const GeneDiseaseTable = memo(
  forwardRef((props: any, ref) => {
    const { columns, data, sortKey, sortOrder, onRequestSort, ...rest } = props
    return (
      // @ts-expect-error TS(2769) FIXME: No overload matches this call.
      <Grid
        ref={ref}
        {...rest}
        columns={columns}
        data={data}
        numRowsRendered={20}
        rowHeight={25}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onRequestSort={onRequestSort}
        rowKey={(row: any) => `${row.uuid}-${row.gene_symbol}-${row.disease_curie}-${row.submitter}`}
      />
    )
  })
)
GeneDiseaseTable.displayName = 'GeneDiseaseTable'

// Main Display Component
const JuhaToolsDisplay = ({ data, toolName }: { data: any, toolName: string }) => {
  if (data?.error) {
    return (
      <DisplayWrapper>
        <ErrorMessage>Error: {data.error}</ErrorMessage>
      </DisplayWrapper>
    )
  }

  // With the new hooks, `data` is the clean `results` array
  const processedData = Array.isArray(data) ? data : []

  if (processedData.length === 0) {
    return (
      <DisplayWrapper>
        <NoResultsMessage>No results found for {toolName}.</NoResultsMessage>
      </DisplayWrapper>
    )
  }

  // Determine which table to render based on data shape
  const firstItem = processedData[0]

  // State for sorting
  const [sortKey, setSortKey] = useState('')
  const [sortOrder, setSortOrder] = useState<'ascending' | 'descending'>('descending')

  const handleRequestSort = (newSortKey: string) => {
    if (newSortKey === sortKey) {
      setSortOrder(sortOrder === 'ascending' ? 'descending' : 'ascending')
    } else {
      setSortKey(newSortKey)
      setSortOrder('descending')
    }
  }

  if (firstItem.cs_id) { // Credible Set data
    const defaultSortKey = sortKey || 'mlog10p'
    return (
      <DisplayWrapper>
        <TableContainer>
          <CredibleSetTable
            columns={credibleSetTableColumns}
            variants={processedData}
            sortKey={defaultSortKey}
            sortOrder={sortOrder}
            onRequestSort={handleRequestSort}
          />
        </TableContainer>
      </DisplayWrapper>
    )
  } else if (firstItem['PP.H4.abf'] !== undefined || firstItem.cs1_id !== undefined) { // Colocalization data
    const defaultSortKey = sortKey || 'PP.H4.abf'
    return (
      <DisplayWrapper>
        <TableContainer>
          <ColocalizationTable
            columns={colocalizationTableColumns}
            variants={processedData}
            sortKey={defaultSortKey}
            sortOrder={sortOrder}
            onRequestSort={handleRequestSort}
          />
        </TableContainer>
      </DisplayWrapper>
    )
  } else if (firstItem.disease_curie) { // Gene-Disease data
    const defaultSortKey = sortKey || 'disease_title'
    return (
      <DisplayWrapper>
        <TableContainer>
          <GeneDiseaseTable
            columns={geneDiseaseTableColumns}
            data={processedData}
            sortKey={defaultSortKey}
            sortOrder={sortOrder}
            onRequestSort={handleRequestSort}
          />
        </TableContainer>
      </DisplayWrapper>
    )
  }

  return (
    <DisplayWrapper>
      <ErrorMessage>
        Unknown data format received from tool.
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
            Sample data keys: {firstItem ? JSON.stringify(Object.keys(firstItem)) : 'no data'}
          </div>
        )}
      </ErrorMessage>
    </DisplayWrapper>
  )
}

export default JuhaToolsDisplay

// Loading Component
export const JuhaToolsLoading: React.FC<{ message: string }> = ({ message }) => {
  // We can reuse VariantLoading for simplicity for now.
  return <VariantLoading message={message} />
}
