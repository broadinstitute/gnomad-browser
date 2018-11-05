import fetch from 'graphql-fetch'
import queryString from 'query-string'
import React from 'react'
import { withRouter } from 'react-router-dom'

import { Searchbox } from '@broad/ui'

const fetchSearchResults = query =>
  fetch(process.env.GNOMAD_API_URL)(
    `
  query Search($query: String!) {
    searchResults(query: $query) {
      label
      value: url
    }
  }
`,
    { query }
  ).then(response => response.data.searchResults)

export default withRouter(props => {
  const { history, location, match, ...rest } = props
  return (
    <Searchbox
      // Clear input when URL changes
      key={history.location.pathname}
      {...rest}
      fetchSearchResults={fetchSearchResults}
      onSelect={url => {
        const currentParams = queryString.parse(location.search)
        const nextParams = { dataset: currentParams.dataset }
        history.push({
          pathname: url,
          search: queryString.stringify(nextParams),
        })
      }}
      placeholder="Search by gene, region, or variant"
    />
  )
})
