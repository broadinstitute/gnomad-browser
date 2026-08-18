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
const query = `
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
    id source_trid reference_genome chrom motifs structure lr_cohort source_release source_run_id
    total_alleles unique_carrier_count selected_allele_valid
    components { chrom start0 end0 motif }
    source_records {
      record_index source_variant_id position alt_count ref non_reference_ac an non_reference_af source region
    }
    repeat_count_plots {
      status reason_code unit repeat_unit max_repunits
      identity {
        ancillary_run_id primary_database primary_run_id primary_task_id primary_attempt_id
        source_variant_id
        component { chrom start0 end0 motif }
      }
      overall {
        called_alleles called_diploid_genotypes no_call_rate no_call_rate_status
      }
      callability {
        ancestry_group sex called_alleles called_diploid_genotypes no_call_rate no_call_rate_status
      }
      allele_size_distribution {
        ancestry_group sex repunit
        distribution { repunit_count frequency }
      }
      genotype_distribution {
        ancestry_group sex short_allele_repunit long_allele_repunit
        distribution { short_allele_repunit_count long_allele_repunit_count frequency }
      }
    }
    short_read_matches { id gene_symbol reference_repeat_unit stripy_id strchive_id }
    alleles {
      nodes {
        variant_id source_variant_id alt_index alt_count ref alt length repeat_count
        repeat_count_source motif_purity
        freq { all { ac an af } populations { id ac an af } }
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
      <PageHeading>
        Tandem-repeat locus {parsed.components[0].chrom}:
        {(parsed.components[0].start0 + 1).toLocaleString()}
        {parsed.components.length > 1
          ? ` (+${parsed.components.length - 1} linked repeat components)`
          : ''}
      </PageHeading>
      <Query
        operationName={operationName}
        query={query}
        requestKey={`${lrCohort}:${parsed.canonicalId}:${after || 'first'}:${selectedAllele || ''}`}
        variables={{
          id: parsed.canonicalId,
          lrCohort,
          first: 50,
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
