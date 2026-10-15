import React from 'react'

import { DatasetId, hasAlleleNumber, referenceGenome } from '@gnomad/dataset-metadata/metadata'

import { alleleNumberConfig } from './coverageStyles'
import { BaseQuery } from './Query'

/** The allele number props a CoverageTrack takes, ready to be spread onto it. */
export type AlleleNumberTrackProps = {
  alleleNumberDatasets?: ReturnType<typeof alleleNumberConfig>
  isAlleleNumberLoading: boolean
}

const NO_ALLELE_NUMBER: AlleleNumberTrackProps = { isAlleleNumberLoading: false }

type Props = {
  datasetId: DatasetId
  operationName: string
  query: string
  /** Feature identifiers only; dataset and reference genome are added here. */
  variables: { [name: string]: any }
  children: (alleleNumber: AlleleNumberTrackProps) => JSX.Element
}

/**
 * Fetches the allele number series that backs a coverage track's call rate metric.
 *
 * This is a request of its own rather than extra fields on the coverage query,
 * for two reasons. A single document would make the coverage track fail
 * outright against an API that predates the `allele_number` field, because an
 * unknown field is a query validation error rather than a null -- the browser
 * could not then be deployed ahead of the API. And BaseQuery, unlike Query,
 * renders its children whatever the request is doing, which is what lets the
 * coverage track draw normally while allele number is loading or unavailable.
 *
 * Datasets without an allele number release skip the request entirely. Note
 * this uses the dataset itself, not `coverageDatasetId`: coverage is shared
 * between a release and its subsets because read depth barely differs between
 * them, but call rate is a function of which samples are in the callset, so a
 * subset must not be shown the full release's numbers.
 *
 * Queries passed here must alias their feature to `feature`, so that one
 * component can read gene, transcript and region responses alike.
 */
const AlleleNumberQuery = ({ datasetId, operationName, query, variables, children }: Props) => {
  if (!hasAlleleNumber(datasetId)) {
    return children(NO_ALLELE_NUMBER)
  }

  return (
    <BaseQuery
      operationName={operationName}
      query={query}
      variables={{ ...variables, datasetId, referenceGenome: referenceGenome(datasetId) }}
    >
      {({ data, loading }: any) => {
        const alleleNumber = data?.feature?.allele_number
        // Empty series become undefined: alleleNumberConfig draws anything
        // truthy, so [] would add a legend entry for a series with no data.
        const exome = alleleNumber?.exome?.length ? alleleNumber.exome : null
        const genome = alleleNumber?.genome?.length ? alleleNumber.genome : null

        return children({
          isAlleleNumberLoading: Boolean(loading),
          alleleNumberDatasets: exome || genome ? alleleNumberConfig(exome, genome) : undefined,
        })
      }}
    </BaseQuery>
  )
}

export default AlleleNumberQuery
