import queryString from 'query-string'
import React, { useEffect, useRef, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Searchbox, Select } from '@gnomad/ui'

import { fetchSearchResults } from './search'
import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  width: ${(props: any) => props.width};

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

const getDefaultSearchDataset = (selectedDataset: any) => {
  if (selectedDataset) {
    if (selectedDataset.startsWith('gnomad_r4')) {
      return 'ourdna'
    }
  }
  return 'ourdna'
}

export default withRouter((props: any) => {
  const {
    history,
    location,
    _match,
    placeholder = 'Search by gene, region, or variant',
    width,
    ...rest
  } = props

  const currentParams = queryString.parse(location.search)
  const defaultSearchDataset = getDefaultSearchDataset(currentParams.dataset)
  /* @ts-expect-error TS(TS2345) FIXME: Argument of type 'string' is not assignable to parameter. */
  const [searchDataset, setSearchDataset] = useState<DatasetId>(defaultSearchDataset)

  // Update search dataset when active dataset changes.
  // Cannot rely on props for this because the top bar does not re-render.
  useEffect(() => {
    return history.listen((newLocation: any) => {
      const newParams = queryString.parse(newLocation.search)
      /* @ts-expect-error TS(TS2345) FIXME: Argument of type 'string' is not assignable to parameter. */
      setSearchDataset(getDefaultSearchDataset(newParams.dataset))
    })
  })

  const innerSearchbox = useRef(null)

  const grch38Datasets: DatasetId[] = ['ourdna']
  // const grch37Datasets: DatasetId[] = []

  return (
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <Wrapper width={width}>
      {/* @ts-expect-error TS(2769) FIXME: No overload matches this call. */}
      <Select
        value={searchDataset}
        onChange={(e: any) => {
          setSearchDataset(e.target.value)
          if (innerSearchbox.current) {
            ;(innerSearchbox.current as any).updateResults()
          }
        }}
      >
        <optgroup label="GRCh38">
          {grch38Datasets.map((datasetId) => (
            <option value={datasetId}>{labelForDataset(datasetId)}</option>
          ))}
        </optgroup>
      </Select>
      <span style={{ flexGrow: 1 }}>
        <Searchbox
          // Clear input when URL changes
          key={history.location.pathname}
          {...rest}
          ref={innerSearchbox}
          width="100%"
          fetchSearchResults={(query) => fetchSearchResults(searchDataset, query)}
          placeholder={placeholder}
          onSelect={(url) => {
            history.push(url)
          }}
        />
      </span>
    </Wrapper>
  )
})
