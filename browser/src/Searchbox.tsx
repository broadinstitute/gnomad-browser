import queryString from 'query-string'
import React, { useEffect, useRef, useState } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { Searchbox, Select } from '@gnomad/ui'

import { fetchSearchResults, getSearchDatasetForSelectedDataset } from './search'
import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import { parseLongReadCohort } from './LongReadVariantPage/longReadCohort'

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  width: ${(props: any) => props.width};
  min-width: 0;
  max-width: 100%;

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
  const defaultSearchDataset = getSearchDatasetForSelectedDataset(currentParams.dataset)
  const [searchDataset, setSearchDataset] = useState<DatasetId>(defaultSearchDataset)
  const [lrCohort, setLrCohort] = useState(parseLongReadCohort(currentParams.lr_cohort))

  // Update search dataset when active dataset changes.
  // Cannot rely on props for this because the top bar does not re-render.
  useEffect(() => {
    return history.listen((newLocation: any) => {
      const newParams = queryString.parse(newLocation.search)
      setSearchDataset(getSearchDatasetForSelectedDataset(newParams.dataset))
      setLrCohort(parseLongReadCohort(newParams.lr_cohort))
    })
  })

  const innerSearchbox = useRef(null)

  const grch38Datasets: DatasetId[] = [
    'gnomad_r4',
    'gnomad_r4_lr',
    'gnomad_r3',
    'gnomad_sv_r4',
    'gnomad_cnv_r4',
  ]
  const grch37Datasets: DatasetId[] = ['gnomad_r2_1', 'gnomad_sv_r2_1', 'exac']

  return (
    // @ts-expect-error TS(2769) FIXME: No overload matches this call.
    <Wrapper width={width}>
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
            <option key={datasetId} value={datasetId}>
              {labelForDataset(datasetId)}
            </option>
          ))}
        </optgroup>
        <optgroup label="GRCh37">
          {grch37Datasets.map((datasetId) => (
            <option key={datasetId} value={datasetId}>
              {labelForDataset(datasetId)}
            </option>
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
          fetchSearchResults={(query) => fetchSearchResults(searchDataset, query, { lrCohort })}
          placeholder={placeholder}
          onSelect={(url) => {
            history.push(url)
          }}
        />
      </span>
    </Wrapper>
  )
})
