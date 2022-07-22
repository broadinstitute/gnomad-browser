import React, { useCallback } from 'react'
import { Redirect } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import Delayed from './Delayed'
import InfoPage from './InfoPage'
import StatusMessage from './StatusMessage'
import { fetchSearchResults } from './search'
import useRequest from './useRequest'

const defaultSearchDataset = 'gnomad_r2_1'

type SearchRedirectProps = {
  query: string
}

const SearchRedirect = ({ query }: SearchRedirectProps) => {
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

  // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
  if (searchResults.length > 0) {
    // @ts-expect-error TS(2786) FIXME: 'Redirect' cannot be used as a JSX component.
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

type SearchRedirectPageProps = {
  query: string
}

const SearchRedirectPage = ({ query }: SearchRedirectPageProps) => {
  return (
    <InfoPage>
      <PageHeading>Search</PageHeading>

      <SearchRedirect query={query} />
    </InfoPage>
  )
}

export default SearchRedirectPage
