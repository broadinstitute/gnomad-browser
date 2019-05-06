import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import { Grid } from '@broad/ui'

import browserConfig from '@browser/config'

import columns from './geneResultColumns'

class GeneResultsTable extends PureComponent {
  static propTypes = {
    results: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  state = {
    sortKey: browserConfig.geneResults.defaultSortColumn,
    sortAscending: true,
  }

  setSortKey = sortKey => {
    this.setState(state => ({
      ...state,
      sortKey,
      sortAscending: sortKey === state.sortKey ? !state.sortAscending : true,
    }))
  }

  getRenderedResults() {
    const { results } = this.props
    const { sortKey, sortAscending } = this.state

    const comparator =
      sortKey === 'gene_name' || sortKey === 'gene_description'
        ? (a, b) => a.localeCompare(b)
        : (a, b) => a - b

    const orderedComparator = sortAscending ? comparator : (a, b) => comparator(b, a)

    const sortedResults = results.sort((resultA, resultB) => {
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
    const results = this.getRenderedResults()

    const { sortKey, sortAscending } = this.state

    return (
      <div>
        {results.length === 0 ? (
          'No results found'
        ) : (
          <Grid
            columns={columns}
            data={results}
            numRowsRendered={32}
            rowKey={result => `${result.gene_name}-${result.gene_id}`}
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
