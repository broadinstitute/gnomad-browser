import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { parseTrLocusId } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'

const operationName = 'LongReadTandemRepeatLocus'
export const LONG_READ_TR_ALLELE_INDEX_LIMIT = 600

const LongReadTrPage = styled(Page)`
  max-width: 1440px;
`

export const longReadTandemRepeatLocusQuery = `
query ${operationName}(
  $id: String!
  $lrCohort: LongReadCohort!
  $first: Int!
  $allele: String
) {
  long_read_tandem_repeat_locus(
    id: $id
    lr_cohort: $lrCohort
    first: $first
    allele: $allele
  ) {
    id source_trid reference_genome chrom motifs structure lr_cohort source_release source_run_id
    total_alleles exact_alt_count exact_alt_count_complete exact_alt_count_unavailable_reason
    delta_min delta_max delta_unavailable_reason
    represented_allele_length_min represented_allele_length_max represented_allele_length_unavailable_reason
    called_allele_count called_sample_count
    unique_carrier_count sequences_available sequences_unavailable_reason selected_allele_valid
    selected_allele_unavailable_reason
    component_measurement_available component_measurement_unavailable_reason
    primary_repeat {
      status reason_code motif component_index selection_basis biological_role
      catalog_id catalog_digest registry_digest
      component { chrom start0 end0 motif }
    }
    primary_motif_measurement {
      status reason_code motif biological_role metric unit scope
      called_alleles reference_alleles alternate_alleles alternate_identities_checked
      bins { exact_units allele_copies }
      genotype {
        status reason_code called_diploid_people no_call_people
        cells { shorter_exact_units longer_exact_units people }
      }
      provenance {
        product_run_id primary_database primary_run_id primary_task_id primary_attempt_id
        source_variant_id registry_digest registry_approval_state algorithm_version
        algorithm_sha256 anchor_rule source_record_sha256 allele_receipt_sha256
        genotype_receipt_sha256 bounds_status serialized_bytes returned_bins returned_cells
      }
    }
    region { chrom start0 end0 size }
    components { chrom start0 end0 motif }
    source_records {
      record_index source_variant_id task_id attempt_id position alt_count
      non_reference_ac an non_reference_af source region
    }
    short_read_context {
      status reason_code catalog_dataset catalog_source catalog_digest
      catalog_record {
        id
        gene { ensembl_id symbol region }
        associated_diseases {
          name symbol omim_id inheritance_mode
          repeat_size_classifications { classification min max }
          notes
        }
        stripy_id strchive_id
        main_reference_region { reference_genome chrom start stop }
        reference_regions { reference_genome chrom start stop }
        reference_repeat_unit
        repeat_units { repeat_unit classification }
      }
      matched_component_index
      matched_component { chrom start0 end0 motif }
      matched_reference_region_index
      exact_reference_component_outline_authorized
      matched_reference_repeat_unit_classifications
      lr_database lr_release lr_run_id lr_cohort
    }
    whole_record_allele_landscape {
      status reason_code unit called_alleles non_reference_called_alleles reference_called_alleles
      exact_alt_count stratified_available stratified_unavailable_reason ancestry_groups sexes
      bins {
        delta called_alleles exact_alt_count allele_ids
        stacks { ancestry_group sex called_alleles }
      }
      purity_points { allele_id delta motif_purity called_alleles }
      purity_available purity_unavailable_reason
    }
    whole_record_genotype_landscape {
      status reason_code unit reference_allele_id called_samples called_alleles ancestry_groups sexes
      cells {
        shorter_delta longer_delta people
        pairs {
          shorter_allele_id longer_allele_id ancestry_group sex people phased_people unphased_people
        }
      }
    }
    selected_allele {
      variant_id source_variant_id alt_index alt_count ref alt length repeat_count repeat_count_source
      motif_purity motif_purity_source decomposition_status decomposition_reason
      rsids filters major_consequence cadd_phred phylop
      short_read_match_id short_read_match_type short_read_match_source
      source_release source_run_id
      freq { all { ac an af } populations { id ac an af } }
    }
    repeat_count_plots {
      status reason_code unit repeat_unit max_repunits
      interaction { interaction_status reason }
      allele_size_distribution {
        ancestry_group sex repunit distribution { repunit_count frequency }
      }
      genotype_distribution {
        ancestry_group sex short_allele_repunit long_allele_repunit
        distribution { short_allele_repunit_count long_allele_repunit_count frequency }
      }
    }
    alleles {
      nodes {
        variant_id source_variant_id alt_index alt_count ref alt length repeat_count
        repeat_count_source motif_purity freq { all { ac an af } populations { id ac an af } }
      }
      page_info { has_next_page }
    }
  }
}
`

export const searchWithSelectedAllele = (search: string, alleleId: string) => {
  const params = new URLSearchParams(search)
  params.set('allele', alleleId)
  return params
}

export const searchForCohort = (search: string, cohort: LongReadCohort) => {
  const params = new URLSearchParams(search)
  params.set('lr_cohort', cohort)
  params.delete('allele')
  return params
}

export const searchWithoutSelectedAllele = (search: string) => {
  const params = new URLSearchParams(search)
  params.delete('allele')
  return params
}

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
  const selectionScroll = useRef<{
    x: number
    y: number
    list: { element: HTMLElement; top: number } | null
  } | null>(null)
  const restoreSelectionScroll = useCallback(() => {
    if (selectionScroll.current) {
      window.scrollTo(selectionScroll.current.x, selectionScroll.current.y)
      if (selectionScroll.current.list) {
        selectionScroll.current.list.element.scrollTop = selectionScroll.current.list.top
      }
    }
  }, [])

  useLayoutEffect(restoreSelectionScroll, [location.key, restoreSelectionScroll])

  if (!parsed) {
    return (
      <LongReadTrPage>
        <DocumentTitle title="Invalid tandem-repeat locus" />
        <PageHeading>Invalid tandem-repeat locus</PageHeading>
        <p>The locus ID must contain exact 0-based, half-open component coordinates and motifs.</p>
      </LongReadTrPage>
    )
  }

  if (parsed.canonicalId !== locusId) return null

  const locationWithParams = (params: URLSearchParams) =>
    `${location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
  const hrefForAllele = (alleleId: string) =>
    locationWithParams(searchWithSelectedAllele(location.search, alleleId))
  const selectAllele = (alleleId: string) => {
    const list = document.querySelector<HTMLElement>('.lr-tr-exact-index-scroll')
    const activationScrollTop = Number(list?.dataset.activationScrollTop)
    const activationWindowX = Number(list?.dataset.activationWindowX)
    const activationWindowY = Number(list?.dataset.activationWindowY)
    if (list) {
      delete list.dataset.activationScrollTop
      delete list.dataset.activationWindowX
      delete list.dataset.activationWindowY
    }
    selectionScroll.current = {
      x: Number.isFinite(activationWindowX) ? activationWindowX : window.scrollX,
      y: Number.isFinite(activationWindowY) ? activationWindowY : window.scrollY,
      list: list
        ? {
            element: list,
            top: Number.isFinite(activationScrollTop) ? activationScrollTop : list.scrollTop,
          }
        : null,
    }
    history.push(hrefForAllele(alleleId))
    restoreSelectionScroll()
    window.requestAnimationFrame?.(restoreSelectionScroll)
  }
  const changeCohort = (cohort: LongReadCohort) => {
    selectionScroll.current = null
    history.push(locationWithParams(searchForCohort(location.search, cohort)))
  }
  const removeInvalidSelection = () =>
    history.replace(locationWithParams(searchWithoutSelectedAllele(location.search)))

  return (
    <LongReadTrPage>
      <Query
        operationName={operationName}
        query={longReadTandemRepeatLocusQuery}
        requestKey={`${lrCohort}:${parsed.canonicalId}`}
        variables={{
          id: parsed.canonicalId,
          lrCohort,
          first: LONG_READ_TR_ALLELE_INDEX_LIMIT,
          allele: selectedAllele || null,
        }}
        loadingMessage="Loading tandem-repeat locus"
        errorMessage="Unable to load tandem-repeat locus"
        rejectGraphQLErrors
        retainPreviousData
        success={(data: any) =>
          Boolean(data) &&
          Object.prototype.hasOwnProperty.call(data, 'long_read_tandem_repeat_locus')
        }
      >
        {({ data, requestVariables, stale }: any) => {
          const loadedLocus = data.long_read_tandem_repeat_locus
          const loadedCohort = stale
            ? requestVariables?.lrCohort || loadedLocus?.lr_cohort
            : lrCohort
          const loadedAllele = stale ? requestVariables?.allele || undefined : selectedAllele
          return (
            <>
              {stale && (
                <p role="status">
                  Loading the requested tandem-repeat cohort and exact allele. Previously loaded
                  data retain their loaded cohort and allele identity and are temporarily inert.
                </p>
              )}
              <div
                {...(stale ? ({ inert: '' } as any) : {})}
                aria-busy={stale || undefined}
                data-revalidating={stale || undefined}
              >
                <LongReadTandemRepeatPage
                  datasetId={datasetId}
                  locus={loadedLocus}
                  requestedCohort={loadedCohort}
                  selectedAllele={loadedAllele}
                  revalidating={stale}
                  onCohortChange={changeCohort}
                  onInvalidSelection={removeInvalidSelection}
                  navigation={{ hrefForAllele, onSelectAllele: selectAllele }}
                />
              </div>
            </>
          )
        }}
      </Query>
    </LongReadTrPage>
  )
}

export default LongReadTandemRepeatPageContainer
