import React, { useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { parseTrLocusId } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'

const operationName = 'LongReadTandemRepeatLocus'
export const LONG_READ_TR_ALLELES_PER_PAGE = 50
export const longReadTandemRepeatLocusQuery = `
query ${operationName}(
  $id: String!
  $lrCohort: LongReadCohort!
  $first: Int!
  $after: String
  $allele: String
) {
  long_read_tandem_repeat_locus(
    id: $id
    lr_cohort: $lrCohort
    first: $first
    after: $after
    allele: $allele
  ) {
    id motifs lr_cohort source_release source_run_id total_alleles selected_allele_valid
    components { chrom start0 end0 motif }
    source_records { source_variant_id }
    short_read_matches { id gene_symbol }
    alleles {
      nodes {
        variant_id alt_index length repeat_count repeat_count_source
        freq { all { ac an af } }
      }
      page_info { has_next_page end_cursor }
    }
  }
}
`

type Props = {
  datasetId: DatasetId
  locusId: string
  lrCohort: LongReadCohort
  selectedAllele?: string
}

const LongReadTandemRepeatPageContainer = ({
  datasetId,
  locusId,
  lrCohort,
  selectedAllele,
}: Props) => {
  const parsed = parseTrLocusId(locusId)
  const history = useHistory()
  const location = useLocation()
  const [after, setAfter] = useState<string | null>(null)

  if (!parsed) {
    return (
      <Page>
        <DocumentTitle title="Invalid tandem-repeat locus" />
        <PageHeading>Invalid tandem-repeat locus</PageHeading>
        <p>The locus ID must contain exact 0-based, half-open component coordinates and motifs.</p>
      </Page>
    )
  }

  if (parsed.canonicalId !== locusId) {
    return null
  }

  const changeCohort = (cohort: LongReadCohort) => {
    const params = new URLSearchParams(location.search)
    params.set('dataset', 'gnomad_r4_lr')
    params.set('lr_cohort', cohort)
    params.delete('allele')
    setAfter(null)
    history.push(`${location.pathname}?${params}`)
  }

  return (
    <Page>
      <DocumentTitle
        title={`Tandem-repeat locus ${parsed.components[0].chrom}:${(
          parsed.components[0].start0 + 1
        ).toLocaleString()}`}
      />
      <Query
        operationName={operationName}
        query={longReadTandemRepeatLocusQuery}
        requestKey={`${lrCohort}:${parsed.canonicalId}:${after || 'first'}:${selectedAllele || ''}`}
        variables={{
          id: parsed.canonicalId,
          lrCohort,
          first: LONG_READ_TR_ALLELES_PER_PAGE,
          after,
          allele: after ? null : selectedAllele || null,
        }}
        loadingMessage="Loading tandem-repeat locus"
        errorMessage="Unable to load tandem-repeat locus"
        success={(data: any) => data.long_read_tandem_repeat_locus}
      >
        {({ data }: any) => (
          <LongReadTandemRepeatPage
            datasetId={datasetId}
            locus={data.long_read_tandem_repeat_locus}
            selectedAllele={selectedAllele}
            onCohortChange={changeCohort}
            onNextPage={(cursor) => setAfter(cursor)}
          />
        )}
      </Query>
    </Page>
  )
}

export default LongReadTandemRepeatPageContainer
