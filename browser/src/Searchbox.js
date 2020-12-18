import queryString from 'query-string'
import React, { useEffect, useRef, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Searchbox, Select } from '@gnomad/ui'

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: ${props => props.width};

  select {
    border-right: 1px solid #ddd;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    background-color: #fff;
  }

  input {
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`

const searchQuery = `
query Search($dataset: DatasetId!, $query: String!) {
  searchResults(dataset: $dataset, query: $query) {
    label
    value: url
  }
}
`

const fetchSearchResults = (dataset, query) =>
  fetch('/api/', {
    body: JSON.stringify({
      query: searchQuery,
      variables: { dataset, query },
    }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(response => {
      if (!response.data.searchResults) {
        throw new Error('Unable to retrieve search results')
      }
      return response.data.searchResults
    })

const getDefaultSearchDataset = selectedDataset => {
  if (selectedDataset) {
    if (selectedDataset.startsWith('gnomad_r3')) {
      return 'gnomad_r3'
    }
    if (selectedDataset === 'exac') {
      return 'exac'
    }
  }
  return 'gnomad_r2_1'
}

export default withRouter(props => {
  const {
    history,
    location,
    match,
    placeholder = 'Search by gene, region, or variant',
    width,
    ...rest
  } = props

  const currentParams = queryString.parse(location.search)
  const defaultSearchDataset = getDefaultSearchDataset(currentParams.dataset)
  const [searchDataset, setSearchDataset] = useState(defaultSearchDataset)

  // Update search dataset when active dataset changes.
  // Cannot rely on props for this because the top bar does not re-render.
  useEffect(() => {
    return history.listen(newLocation => {
      const newParams = queryString.parse(newLocation.search)
      setSearchDataset(getDefaultSearchDataset(newParams.dataset))
    })
  })

  const innerSearchbox = useRef(null)

  return (
    <Wrapper width={width}>
      <Select
        value={searchDataset}
        onChange={e => {
          setSearchDataset(e.target.value)
          if (innerSearchbox.current) {
            innerSearchbox.current.updateResults()
          }
        }}
      >
        <option value="gnomad_r3">gnomAD v3.1</option>
        <option value="gnomad_r2_1">gnomAD v2.1.1</option>
        <option value="exac">ExAC</option>
      </Select>
      <span style={{ flexGrow: 1 }}>
        <Searchbox
          // Clear input when URL changes
          key={history.location.pathname}
          {...rest}
          ref={innerSearchbox}
          width="100%"
          fetchSearchResults={query => fetchSearchResults(searchDataset, query)}
          placeholder={placeholder}
          onSelect={url => {
            const parsedUrl = queryString.parseUrl(url)
            const nextParams = { dataset: searchDataset }
            history.push({
              pathname: parsedUrl.url,
              search: queryString.stringify(nextParams),
            })
          }}
        />
      </span>
    </Wrapper>
  )
})
