import PropTypes from 'prop-types'
import React, { useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import Delayed from './Delayed'
import InfoPage from './InfoPage'
import StatusMessage from './StatusMessage'
import { fetchSearchResults } from './search'

const defaultSearchDataset = 'gnomad_r2_1'

const cancelable = promise => {
  let isCanceled = false
  const wrapper = new Promise((resolve, reject) => {
    promise.then(
      value => {
        if (!isCanceled) {
          resolve(value)
        }
      },
      error => {
        if (!isCanceled) {
          reject(error)
        }
      }
    )
  })

  return {
    cancel: () => {
      isCanceled = true
    },
    promise: wrapper,
  }
}

const SearchRedirect = ({ query }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const request = cancelable(fetchSearchResults(defaultSearchDataset, query))
    request.promise.then(setSearchResults, setError).finally(() => {
      setIsLoading(false)
    })
    return () => {
      request.cancel()
    }
  }, [query])

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
