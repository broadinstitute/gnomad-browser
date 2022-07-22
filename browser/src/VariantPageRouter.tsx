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
import { fetchVariantSearchResults } from './search'

const MitochondrialVariantPage = lazy(() =>
  import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))

type VariantSearchProps = {
  datasetId: string
  query: string
}

const VariantSearch = ({ datasetId, query }: VariantSearchProps) => {
  const search = useCallback(() => fetchVariantSearchResults(datasetId, query), [datasetId, query])
  const { isLoading, response: matchingVariants, error } = useRequest(search)

  if (isLoading) {
    return <StatusMessage>Searching variants</StatusMessage>
  }
  if (error || !matchingVariants) {
    return <StatusMessage>Unable to complete search</StatusMessage>
  }
  if ((matchingVariants as any).length === 0) {
    return <p>No matching variants found.</p>
  }

  if ((matchingVariants as any).length === 1) {
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
      {/* @ts-expect-error TS(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <List>
        {(matchingVariants as any).map((variantId: any) => (
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
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

type VariantSearchPageProps = {
  datasetId: string
  query: string
}

const VariantSearchPage = ({ datasetId, query }: VariantSearchPageProps) => {
  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
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

type VariantPageRouterProps = {
  datasetId: string
  variantId: string
}

const VariantPageRouter = ({ datasetId, variantId }: VariantPageRouterProps) => {
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

  if (isRsId(variantId) || /^CA[0-9]+$/i.test(variantId) || /^[0-9]+$/.test(variantId)) {
    return <VariantSearchPage datasetId={datasetId} query={variantId} />
  }

  return (
    // @ts-expect-error TS(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <Page>
      <DocumentTitle title="Invalid variant ID" />
      <PageHeading>Invalid Variant ID</PageHeading>
      <p>Expected chrom-pos-ref-alt variant ID, rsID, or ClinVar variation ID.</p>
    </Page>
  )
}

export default VariantPageRouter
