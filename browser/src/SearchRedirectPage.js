import PropTypes from 'prop-types'
import React, { useCallback } from 'react'
import { Redirect } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import Delayed from './Delayed'
import InfoPage from './InfoPage'
import StatusMessage from './StatusMessage'
import { fetchSearchResults } from './search'
import useRequest from './useRequest'

const defaultSearchDataset = 'gnomad_r2_1'

const SearchRedirect = ({ query }) => {
  const search = useCallback(() => fetchSearchResults(defaultSearchDataset, query), [query])
  const { isLoading, response: searchResults, error } = useRequest(search)

  if (isLoading) {
    return (
      <Delayed>
        <StatusMessage>Searching</StatusMessage>
      </Delayed>
    )
  }

  if (error) {
    return <StatusMessage>Unable to load search results</StatusMessage>
  }

  if (searchResults.length > 0) {
    return <Redirect to={searchResults[0].value} />
  }

  return (
    <p>
      No results found for &quot;
      {query}
      &quot;.
    </p>
  )
}

SearchRedirect.propTypes = {
  query: PropTypes.string.isRequired,
}

const SearchRedirectPage = ({ query }) => {
  return (
    <InfoPage>
      <PageHeading>Search</PageHeading>

      <SearchRedirect query={query} />
    </InfoPage>
  )
}

SearchRedirectPage.propTypes = {
  query: PropTypes.string.isRequired,
}

export default SearchRedirectPage
