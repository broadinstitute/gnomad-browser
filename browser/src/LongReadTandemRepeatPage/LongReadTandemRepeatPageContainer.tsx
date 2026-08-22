import React, { useCallback, useLayoutEffect, useRef } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { parseTrLocusId, trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import Query from '../Query'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'

const operationName = 'LongReadTandemRepeatLocus'
export const LONG_READ_TR_ALLELE_INDEX_LIMIT = 600
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
    delta_min delta_max delta_unavailable_reason called_allele_count called_sample_count
    unique_carrier_count sequences_available sequences_unavailable_reason selected_allele_valid
    selected_allele_unavailable_reason
    component_measurement_available component_measurement_unavailable_reason
    region { chrom start0 end0 size }
    components { chrom start0 end0 motif }
    source_records {
      record_index source_variant_id task_id attempt_id position alt_count
      non_reference_ac an non_reference_af source region
    }
    short_read_matches { id gene_symbol reference_repeat_unit stripy_id strchive_id }
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
        variant_id source_variant_id alt_index alt_count length repeat_count repeat_count_source
        motif_purity freq { all { ac an af } populations { id ac an af } }
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
      <Page>
        <DocumentTitle title="Invalid tandem-repeat locus" />
        <PageHeading>Invalid tandem-repeat locus</PageHeading>
        <p>The locus ID must contain exact 0-based, half-open component coordinates and motifs.</p>
      </Page>
    )
  }

  if (parsed.canonicalId !== locusId) return null

  const envelope = trLocusDisplayEnvelope(parsed)
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
    <Page>
      <DocumentTitle
        title={`Tandem repeat at chr${
          envelope.chrom
        }:${envelope.start1.toLocaleString()}–${envelope.end1.toLocaleString()} (GRCh38)`}
      />
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
        retainPreviousData
        success={(data: any) => data.long_read_tandem_repeat_locus}
      >
        {({ data }: any) => {
          return (
            <LongReadTandemRepeatPage
              datasetId={datasetId}
              locus={data.long_read_tandem_repeat_locus}
              selectedAllele={selectedAllele}
              onCohortChange={changeCohort}
              onInvalidSelection={removeInvalidSelection}
              navigation={{ hrefForAllele, onSelectAllele: selectAllele }}
            />
          )
        }}
      </Query>
    </Page>
  )
}

export default LongReadTandemRepeatPageContainer
