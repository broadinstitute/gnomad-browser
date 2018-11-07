import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'
import styled from 'styled-components'

import { Grid, Search } from '@broad/ui'

import Link from './Link'

const ResultsSearchWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1em;
`

const renderExponentialNumberCell = (row, key) => {
  const number = row[key]
  if (number === null || number === undefined) {
    return ''
  }
  const truncated = Number(number.toPrecision(3))
  if (truncated === 0) {
    return '0'
  }
  return truncated.toExponential()
}

class GeneResultsTable extends PureComponent {
  static propTypes = {
    results: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  state = {
    searchText: '',
    sortKey: 'pval_meta',
    sortAscending: true,
  }

  setSearchText = searchText =>
    this.setState({
      searchText: String(searchText).toUpperCase(),
    })

  setSortKey = sortKey => {
    this.setState(state => ({
      ...state,
      sortKey,
      sortAscending: sortKey === state.sortKey ? !state.sortAscending : true,
    }))
  }

  getRenderedResults() {
    const { results } = this.props
    const { searchText, sortKey, sortAscending } = this.state

    const filteredResults = results.filter(result => (result.gene_name || '').includes(searchText))

    const comparator = ['gene_name', 'description', 'gene_id'].includes(sortKey)
      ? (a, b) => a.localeCompare(b)
      : (a, b) => a - b

    const orderedComparator = sortAscending ? comparator : (a, b) => comparator(b, a)

    const sortedResults = filteredResults.sort((resultA, resultB) => {
      const sortValA = resultA[sortKey]
      const sortValB = resultB[sortKey]

      if (sortValA === null || sortValA === '') {
        return 1
      }

      if (sortValB === null || sortValB === '') {
        return -1
      }

      return orderedComparator(sortValA, sortValB)
    })

    return sortedResults
  }

  render() {
    const columns = [
      {
        key: 'gene_name',
        heading: 'Gene Name',
        isSortable: true,
        minWidth: 80,
        searchable: true,
        render: row => <Link to={`/gene/${row.gene_name}`}>{row.gene_name}</Link>,
      },
      {
        key: 'description',
        heading: 'Description',
        isSortable: true,
        minWidth: 140,
      },
      {
        key: 'gene_id',
        heading: 'Gene ID',
        isSortable: true,
        minWidth: 120,
      },
      {
        key: 'case_lof',
        heading: 'Case LOF',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'ctrl_lof',
        heading: 'Ctrl LOF',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'pval_lof',
        heading: 'P-Val LOF',
        isSortable: true,
        minWidth: 80,
        render: renderExponentialNumberCell,
      },
      {
        key: 'case_mpc',
        heading: 'Case MPC',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'ctrl_mpc',
        heading: 'Ctrl MPC',
        isSortable: true,
        minWidth: 60,
      },
      {
        key: 'pval_mpc',
        heading: 'P-Val MPC',
        isSortable: true,
        minWidth: 80,
        render: renderExponentialNumberCell,
      },
      {
        key: 'pval_meta',
        heading: 'P-Val Meta',
        isSortable: true,
        minWidth: 80,
        render: renderExponentialNumberCell,
      },
    ]

    const results = this.getRenderedResults()

    const { sortKey, sortAscending } = this.state

    return (
      <div>
        <ResultsSearchWrapper>
          <Search placeholder="Search genes" onChange={this.setSearchText} />
        </ResultsSearchWrapper>
        {results.length === 0 ? (
          'No results found'
        ) : (
          <Grid
            columns={columns}
            data={results}
            numRowsRendered={32}
            rowKey={variant => variant.gene_id}
            sortKey={sortKey}
            sortOrder={sortAscending ? 'ascending' : 'descending'}
            onRequestSort={this.setSortKey}
          />
        )}
      </div>
    )
  }
}

export default GeneResultsTable
