/* eslint-disable react/prop-types */
import React from 'react'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { List, Record } from 'immutable'

import { Table } from '@broad/table'

import {
  screenSize,
  GenePage,
  // Summary,
  // TableSection,
} from '@broad/ui'

const schizophreniaGeneResultsQuery = gql`
  {
    schzGeneResults {
      gene_name
      description
      gene_id
      case_lof
      ctrl_lof
      pval_lof
      case_mpc
      ctrl_mpc
      pval_mpc
      pval_meta
    }
  }
`

const GeneResult = Record({
  gene_name: null,
  description: null,
  gene_id: null,
  case_lof: null,
  ctrl_lof: null,
  pval_lof: null,
  case_mpc: null,
  ctrl_mpc: null,
  pval_mpc: null,
  pval_meta: null,
})

const withQuery = graphql(schizophreniaGeneResultsQuery)

const tableConfig = onHeaderClick => ({
  fields: [
    { dataKey: 'gene_name', title: 'gene_name', dataType: 'string', onHeaderClick, width: 80 },
    { dataKey: 'description', title: 'description', dataType: 'string', onHeaderClick, width: 140 },
    { dataKey: 'gene_id', title: 'gene_id', dataType: 'string', onHeaderClick, width: 100 },
    { dataKey: 'case_lof', title: 'case_lof', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'ctrl_lof', title: 'ctrl_lof', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'pval_lof', title: 'pval_lof', dataType: 'float', onHeaderClick, width: 80 },
    { dataKey: 'case_mpc', title: 'case_mpc', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'ctrl_mpc', title: 'ctrl_mpc', dataType: 'integer', onHeaderClick, width: 60 },
    { dataKey: 'pval_mpc', title: 'pval_mpc', dataType: 'float', onHeaderClick, width: 80 },
    { dataKey: 'pval_meta', title: 'pval_meta', dataType: 'float', onHeaderClick, width: 80 },
  ],
})


const SchizophreniaGeneResultsTable = ({
  data: { loading, schzGeneResults },
  screenSize,
}) => {
  if (loading) {
    return <div>Loading</div>
  }
  const tableWidth = (screenSize.width * 0.8) + 40
  const data = new List(schzGeneResults.map(e => new GeneResult(e)))
  return (
    <GenePage>
      <Table
        height={500}
        width={tableWidth}
        tableConfig={tableConfig(console.log)}
        tableData={data}
        remoteRowCount={data.size}
        loadMoreRows={() => {}}
        overscan={5}
        loadLookAhead={0}
        onRowClick={() => {}}
        onRowHover={() => {}}
        onScroll={() => {}}
        searchText={''}
      />
    </GenePage>
  )
}

const mapStatesToProps = state => ({
  screenSize: screenSize(state),
})

export default compose(
  connect(mapStatesToProps),
  withQuery
)(SchizophreniaGeneResultsTable)
