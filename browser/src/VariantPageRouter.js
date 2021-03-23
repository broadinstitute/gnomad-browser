import PropTypes from 'prop-types'
import queryString from 'query-string'
import React, { lazy } from 'react'
import { Redirect } from 'react-router-dom'

import { isVariantId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import { Badge, List, ListItem, Page, PageHeading } from '@gnomad/ui'

import { labelForDataset } from './datasets'
import DocumentTitle from './DocumentTitle'
import Link from './Link'
import Query from './Query'

const MitochondrialVariantPage = lazy(() =>
  import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))

const VARIANT_SEARCH_QUERY = `
query VariantSearch($query: String!, $datasetId: DatasetId!) {
  variant_search(query: $query, dataset: $datasetId) {
    variant_id
  }
}
`

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

      <Query
        query={VARIANT_SEARCH_QUERY}
        variables={{ datasetId, query }}
        loadingMessage="Searching variants"
        errorMessage="Unable to complete search"
        success={data => data.variant_search}
      >
        {({ data }) => {
          const matchingVariants = data.variant_search.map(result => result.variant_id)

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
        }}
      </Query>
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
