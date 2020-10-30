import PropTypes from 'prop-types'
import React from 'react'
import { Redirect } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import InfoPage from './InfoPage'
import Query from './Query'

const defaultSearchDataset = 'gnomad_r2_1'

const searchQuery = `
query Search($query: String!, $dataset: DatasetId!) {
  searchResults(query: $query, dataset: $dataset) {
    label
    url
  }
}
`

const SearchRedirectPage = ({ query }) => (
  <InfoPage>
    <PageHeading>Search</PageHeading>

    <Query
      query={searchQuery}
      variables={{ query, dataset: defaultSearchDataset }}
      loadingMessage="Searching"
      errorMessage="Unable to load search results"
      success={data => data.searchResults}
    >
      {({ data }) => {
        const results = data.searchResults

        if (results.length) {
          return <Redirect to={results[0].url} />
        }

        return (
          <p>
            No results found for &quot;
            {query}
            &quot;.
          </p>
        )
      }}
    </Query>
  </InfoPage>
)

SearchRedirectPage.propTypes = {
  query: PropTypes.string.isRequired,
}

export default SearchRedirectPage
