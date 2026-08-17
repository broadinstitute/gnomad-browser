import React, { useCallback } from 'react'
import { Redirect } from 'react-router-dom'

import { PageHeading } from '@gnomad/ui'

import Delayed from './Delayed'
import InfoPage from './InfoPage'
import StatusMessage from './StatusMessage'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { fetchSearchResults } from './search'
import useRequest from './useRequest'
import type { LongReadCohort } from './LongReadVariantPage/longReadCohort'

const defaultSearchDataset: DatasetId = 'gnomad_r4'

type SearchRedirectProps = {
  query: string
  datasetId: DatasetId
  lrCohort?: LongReadCohort
}

const SearchRedirect = ({ query, datasetId, lrCohort }: SearchRedirectProps) => {
  const search = useCallback(
    () => fetchSearchResults(datasetId, query, { lrCohort }),
    [datasetId, lrCohort, query]
  )
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
  datasetId?: DatasetId
  lrCohort?: LongReadCohort
}

const SearchRedirectPage = ({
  query,
  datasetId = defaultSearchDataset,
  lrCohort,
}: SearchRedirectPageProps) => {
  return (
    <InfoPage>
      <PageHeading>Search</PageHeading>

      <SearchRedirect query={query} datasetId={datasetId} lrCohort={lrCohort} />
    </InfoPage>
  )
}

export default SearchRedirectPage
