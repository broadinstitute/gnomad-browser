import queryString from 'query-string'
import React, { useCallback, lazy } from 'react'
import { Redirect, useLocation } from 'react-router-dom'

import { isVariantId, normalizeVariantId, isRsId } from '@gnomad/identifiers'
import {
  isLongReadVariantId,
  parseLongReadVariantId,
} from '@gnomad/dataset-metadata/longReadVariantId'
import { parseTrLocusId } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { Badge, List, ListItem, Page, PageHeading } from '@gnomad/ui'

import {
  DatasetId,
  labelForDataset,
  hasStructuralVariants,
  hasCopyNumberVariants,
  isLongRead,
} from '@gnomad/dataset-metadata/metadata'
import DocumentTitle from './DocumentTitle'
import Link from './Link'
import useRequest from './useRequest'
import StatusMessage from './StatusMessage'
import { fetchVariantSearchResults } from './search'
import type { LongReadCohort } from './LongReadVariantPage/longReadCohort'
import { formatLongReadVariantId } from './LongReadVariantPage/formatLongReadVariantId'
import { BaseQuery } from './Query'

const MitochondrialVariantPage = lazy(
  () => import('./MitochondrialVariantPage/MitochondrialVariantPage')
)
const MNVPage = lazy(() => import('./MNVPage/MNVPage'))
const StructuralVariantPage = lazy(() => import('./StructuralVariantPage/StructuralVariantPage'))
const CopyNumberVariantPage = lazy(() => import('./CopyNumberVariantPage/CopyNumberVariantPage'))
const VariantPage = lazy(() => import('./VariantPage/VariantPage'))
type VariantSearchProps = {
  datasetId: DatasetId
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
      <List>
        {(matchingVariants as any).map((variantId: any) => (
          <ListItem key={variantId}>
            <Link
              to={{
                pathname: `/variant/${variantId}`,
                search: queryString.stringify({ dataset: datasetId }),
              }}
            >
              {isLongRead(datasetId) ? formatLongReadVariantId(variantId) : variantId}
            </Link>
          </ListItem>
        ))}
      </List>
    </>
  )
}

type VariantSearchPageProps = {
  datasetId: DatasetId
  query: string
}

const VariantSearchPage = ({ datasetId, query }: VariantSearchPageProps) => {
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

export const isLegacyExactLongReadTrAllele = (datasetId: DatasetId, variantId: string) => {
  const parsed = parseLongReadVariantId(variantId)
  return isLongRead(datasetId) && parsed?.alleleType === 'trv' && (parsed.provenance || 0) > 0
}

export const legacyTrRedirectSearch = (
  search: string,
  variantId: string,
  lrCohort?: LongReadCohort
) => {
  const params = queryString.parse(search)
  params.allele = variantId
  if (lrCohort) params.lr_cohort = lrCohort
  else delete params.lr_cohort
  return queryString.stringify(params)
}

const LegacyLongReadTrRedirect = ({
  variantId,
  lrCohort,
}: {
  variantId: string
  lrCohort?: LongReadCohort
}) => {
  const location = useLocation()
  return (
    <BaseQuery
      operationName="LegacyLongReadTrRedirect"
      query={`query LegacyLongReadTrRedirect($variantId: String!, $lrCohort: LongReadCohort) {
        long_read_variant(variantId: $variantId, lr_cohort: $lrCohort) {
          allele_type
          tr_locus_id
        }
      }`}
      variables={{ variantId, lrCohort }}
    >
      {({ data, error, loading }: any) => {
        if (loading) return <StatusMessage>Resolving tandem-repeat locus</StatusMessage>
        const variant = data?.long_read_variant
        const locus = parseTrLocusId(variant?.tr_locus_id || '')
        if (error || variant?.allele_type?.toLowerCase() !== 'trv' || !locus) {
          return (
            <StatusMessage role="alert">
              Unable to resolve this exact tandem-repeat allele to a canonical locus.
            </StatusMessage>
          )
        }
        // Redirect uses history.replace by default, so Back does not revisit the legacy URL.
        return (
          <Redirect
            to={{
              pathname: `/tandem-repeat/${locus.canonicalId}`,
              search: legacyTrRedirectSearch(location.search, variantId, lrCohort),
            }}
          />
        )
      }}
    </BaseQuery>
  )
}

type VariantPageRouterProps = {
  datasetId: DatasetId
  variantId: string
  lrCohort?: LongReadCohort
}

const VariantPageRouter = ({ datasetId, variantId, lrCohort }: VariantPageRouterProps) => {
  if (isLegacyExactLongReadTrAllele(datasetId, variantId)) {
    return <LegacyLongReadTrRedirect variantId={variantId} lrCohort={lrCohort} />
  }

  if (hasStructuralVariants(datasetId)) {
    return <StructuralVariantPage datasetId={datasetId} variantId={variantId} />
  }

  if (hasCopyNumberVariants(datasetId)) {
    return <CopyNumberVariantPage datasetId={datasetId} variantId={variantId} />
  }

  if (isVariantId(variantId)) {
    const normalizedVariantId = normalizeVariantId(variantId).replace(/^MT/, 'M')
    const [chrom, _pos, ref, alt] = normalizedVariantId.split('-')
    if (ref.length === alt.length && ref.length > 1) {
      return <MNVPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    if (chrom === 'M') {
      return <MitochondrialVariantPage datasetId={datasetId} variantId={normalizedVariantId} />
    }

    return <VariantPage datasetId={datasetId} variantId={normalizedVariantId} lrCohort={lrCohort} />
  }

  // LR-only variant IDs (e.g., TRV, DEL, INS) route to the standard VariantPage
  // which handles them via the API's LR fallback
  if (isLongReadVariantId(variantId)) {
    return <VariantPage datasetId={datasetId} variantId={variantId} lrCohort={lrCohort} />
  }

  if (isRsId(variantId) || /^CA[0-9]+$/i.test(variantId) || /^[0-9]+$/.test(variantId)) {
    return <VariantSearchPage datasetId={datasetId} query={variantId} />
  }

  return (
    <Page>
      <DocumentTitle title="Invalid variant ID" />
      <PageHeading>Invalid Variant ID</PageHeading>
      <p>Expected chrom-pos-ref-alt variant ID, rsID, or ClinVar variation ID.</p>
    </Page>
  )
}

export default VariantPageRouter
