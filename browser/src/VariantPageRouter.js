import PropTypes from 'prop-types'
import queryString from 'query-string'
import React, { lazy, useCallback } from 'react'
import { Redirect } from 'react-router-dom'

import { isVariantId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import { Badge, List, ListItem, Page, PageHeading } from '@gnomad/ui'

import { labelForDataset } from './datasets'
import DocumentTitle from './DocumentTitle'
import Link from './Link'
import useRequest from './useRequest'
import StatusMessage from './StatusMessage'

const MitochondrialVariantPage = lazy(() =>
  import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))

const fetchVariantSearchResults = (datasetId, query) => {
  return fetch('/api/', {
    body: JSON.stringify({
      query: `
        query VariantSearch($query: String!, $datasetId: DatasetId!) {
          variant_search(query: $query, dataset: $datasetId) {
            variant_id
          }
        }
      `,
      variables: { datasetId, query },
    }),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(response => {
      if (!response.data.variant_search) {
        throw new Error('Unable to retrieve search results')
      }

      return response.data.variant_search.map(result => result.variant_id)
    })
}

const VariantSearch = ({ datasetId, query }) => {
  const search = useCallback(() => fetchVariantSearchResults(datasetId, query), [datasetId, query])
  const { isLoading, response: matchingVariants, error } = useRequest(search)

  if (isLoading) {
    return <StatusMessage>Searching variants</StatusMessage>
  }
  if (error || !matchingVariants) {
    return <StatusMessage>Unable to complete search</StatusMessage>
  }
  if (matchingVariants.length === 0) {
    return <p>No matching variants found.</p>
  }

  if (matchingVariants.length === 1) {
    return (
      <Redirect
        to={{
          pathname: `/variant/${matchingVariants[0]}`,
          search: queryString.stringify({ dataset: datasetId }),
        }}
      />
    )
  }

  return (
    <>
      <p style={{ fontSize: '16px' }}>Multiple matching variants found:</p>
      <List>
        {matchingVariants.map(variantId => (
          <ListItem key={variantId}>
            <Link
              to={{
                pathname: `/variant/${variantId}`,
                search: queryString.stringify({ dataset: datasetId }),
              }}
            >
              {variantId}
            </Link>
          </ListItem>
        ))}
      </List>
    </>
  )
}

VariantSearch.propTypes = {
  datasetId: PropTypes.string.isRequired,
  query: PropTypes.string.isRequired,
}

const VariantSearchPage = ({ datasetId, query }) => {
  return (
    <Page>
      <DocumentTitle title={`${query} | ${labelForDataset(datasetId)}`} />
      <PageHeading>{query}</PageHeading>

      {isRsId(query) && (
        <p style={{ fontSize: '16px' }}>
          <Badge level="info">Note</Badge> We discourage searching by rsIDs as they can be
          ambiguous, and generally recommend searching for variants using chromosome, position,
          reference, and alternate alleles to ensure an accurate match.
        </p>
      )}

      <VariantSearch datasetId={datasetId} query={query} />
    </Page>
  )
}

VariantSearchPage.propTypes = {
  datasetId: PropTypes.string.isRequired,
  query: PropTypes.string.isRequired,
}

const VariantPageRouter = ({ datasetId, variantId }) => {
  if (datasetId.startsWith('gnomad_sv')) {
    return <StructuralVariantPage datasetId={datasetId} variantId={variantId} />
  }

  if (isVariantId(variantId)) {
    const normalizedVariantId = normalizeVariantId(variantId).replace(/^MT/, 'M')
    const [chrom, pos, ref, alt] = normalizedVariantId.split('-') // eslint-disable-line no-unused-vars
    if (ref.length === alt.length && ref.length > 1) {
      return <MNVPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    if (chrom === 'M') {
      return <MitochondrialVariantPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    return <VariantPage datasetId={datasetId} variantId={normalizedVariantId} />
  }

  if (isRsId(variantId)) {
    return <VariantSearchPage datasetId={datasetId} query={variantId} />
  }

  return (
    <Page>
      <DocumentTitle title="Invalid variant ID" />
      <PageHeading>Invalid Variant ID</PageHeading>
      <p>Variant IDs must be chrom-pos-ref-alt or rsIDs.</p>
    </Page>
  )
}

VariantPageRouter.propTypes = {
  datasetId: PropTypes.string.isRequired,
  variantId: PropTypes.string.isRequired,
}

export default VariantPageRouter
