import fetch from 'graphql-fetch'
import React from 'react'
import { withRouter } from 'react-router-dom'

import { Searchbox } from '@broad/ui'

const fetchSearchResults = query =>
  fetch('/api')(
    `
  query Search($query: String!) {
    search(query: $query) {
      label
      value: url
    }
  }
`,
    { query }
  ).then(response => response.data.search)

export default withRouter(props => {
  const { history, location, match, ...rest } = props
  return (
    <Searchbox
      // Clear input when URL changes
      key={history.location.pathname}
      {...rest}
      fetchSearchResults={fetchSearchResults}
      onSelect={url => {
        history.push({ pathname: url })
      }}
      placeholder="Search results by gene"
    />
  )
})
