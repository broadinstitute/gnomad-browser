/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
import gql from 'graphql-tag'
import { graphql, compose } from 'react-apollo'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { List, Record } from 'immutable'
import Highlighter from 'react-highlight-words'

import { Table } from '@broad/table'

import {
  screenSize,
  GenePage,
  Summary,
  GeneSymbol,
  TableSection,
  Search,
} from '@broad/ui'

const ResultsSearchWrapper = styled.div`
  margin-bottom: 10px;
  margin-top: 10px;
`

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
  gene_name: '',
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
    { dataKey: 'gene_name', title: 'gene_name', dataType: 'link', onHeaderClick, width: 80, searchable: true },
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


class SchizophreniaGeneResults extends PureComponent {
  state = {
    searchText: '',
    sortKey: 'pval_meta',
    sortAscending: true,
  }

  setSearchText = searchText => this.setState({ searchText })

  setSortState = (sortKey) => {
    this.setState({
      sortKey,
      sortAscending: !this.state.sortAscending
    })
  }

  sortData = (data, key, ascending) => {
    if (data.isEmpty()) return new List()
    if (typeof data.first().get(key) === 'string') {
      return (
        ascending ?
          data.sort((a, b) => a.get(key).localeCompare(b.get(key))) :
          data.sort((a, b) => b.get(key).localeCompare(a.get(key)))
      )
    }
    return (
      ascending ?
        data.sort((a, b) => a.get(key) - b.get(key)) :
        data.sort((a, b) => b.get(key) - a.get(key))
    )
  }

  geneOnClick = geneName => this.props.history.push(`/gene/${geneName}`)

  render () {
    const {
      data: { loading, schzGeneResults },
      screenSize,
    } = this.props

    if (loading) {
      return <div>Loading</div>
    }

    const tableWidth = (screenSize.width * 0.8) + 40
    const data = new List(schzGeneResults.map(e => new GeneResult(e)))
    const searchResults = data.filter((e) => {
      if (e.gene_name) {
        return e.gene_name.includes(this.state.searchText)
      }
      return false
    })
    const sortedData = this.sortData(searchResults, this.state.sortKey, this.state.sortAscending)

    return (
      <GenePage>
        <GeneSymbol>Exome meta-analysis results</GeneSymbol>
        <ResultsSearchWrapper>
          <Search
            placeholder={'Search genes'}
            onChange={this.setSearchText}
          />
        </ResultsSearchWrapper>
        {sortedData.isEmpty() ? 'No results found' : (
          <Table
            height={800}
            width={tableWidth}
            tableConfig={tableConfig(this.setSortState)}
            tableData={sortedData}
            remoteRowCount={sortedData.size}
            loadMoreRows={() => {}}
            overscan={5}
            loadLookAhead={0}
            onRowClick={this.geneOnClick}
            onRowHover={() => {}}
            onScroll={() => {}}
            searchText={this.state.searchText}
            filteredIdList={new List(['test'])}
          />
        )}
      </GenePage>
    )
  }
}

const mapStatesToProps = state => ({
  screenSize: screenSize(state),
})

export default compose(
  withRouter,
  connect(mapStatesToProps),
  withQuery
)(SchizophreniaGeneResults)
