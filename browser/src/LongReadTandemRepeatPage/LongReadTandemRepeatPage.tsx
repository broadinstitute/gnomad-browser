import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { ExternalLink, List, ListItem, PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'

import AttributeList, { AttributeListItem } from '../AttributeList'
import DocumentTitle from '../DocumentTitle'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { isExperimentalFeatureEnabled } from '../experimentalFeatures'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadTrComponentTrack,
  SelectedExactAlleleDetail,
  WholeRecordAlleleLandscape,
  signed,
  unavailableReason,
} from './LongReadTrVisualizations'
import ShortReadKnownLocusContext from './ShortReadKnownLocusContext'
import { referenceRepeatSequence, referenceSequencePurity } from './referenceSequencePurity'
import LocalHaplotypeBackgroundsSection from './LocalHaplotypeBackgroundsSection'
import {
  strchiveLocusUrl,
  stripyLocusUrl,
  trExplorerRegionUrl,
} from '../ShortTandemRepeatPage/externalResourceUrls'
import { AlleleNavigation, LongReadTrLocus } from './types'

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2em;
  margin-bottom: 1.25em;

  h1 {
    margin-bottom: 0.25em;
  }

  @media (max-width: 700px) {
    display: block;
  }
`

const HeadingWithHelp = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35em;

  h1,
  h2 {
    margin-right: 0;
  }
`

const CohortControl = styled.label`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.25em;
  font-weight: bold;
`

const CoordinateContext = styled.div`
  color: #596a75;
  font-size: 1.05em;
`

const SourceAttributes = styled.div`
  margin-top: 1em;
`

const HeaderColumns = styled.div`
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 3em;
`

const HeaderColumn = styled.section`
  width: calc(50% - 15px);

  @media (max-width: 992px) {
    width: 100%;
  }
`

const LocusOverviewHelp = () => (
  <HaplotypeHelpButton title="About this tandem-repeat locus">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> The canonical long-read locus, observed exact ALT sequences,
      aggregate plots, and any exact short-read catalog context.
    </p>
    <p>
      <strong>How to use it.</strong> Choose a long-read cohort, review the available plots, then
      filter or select an exact ALT sequence in the Allelic landscape.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> Short-read catalog labels and ranges do not classify
      long-read alleles, genotypes, components, people, or total allele length change.
    </p>
  </HaplotypeHelpButton>
)

const cohortName = (cohort: LongReadCohort) =>
  cohort === 'hgsvc_hprc' ? 'HGSVC / HPRC' : 'All of Us'

const exactComponent = (left: any, right: any) =>
  Boolean(
    left &&
      right &&
      String(left.chrom).replace(/^chr/i, '') === String(right.chrom).replace(/^chr/i, '') &&
      left.start0 === right.start0 &&
      left.end0 === right.end0 &&
      left.motif === right.motif
  )

const CohortSelector = ({
  cohort,
  onCohortChange,
}: {
  cohort: LongReadCohort
  onCohortChange: (cohort: LongReadCohort) => void
}) => (
  <CohortControl htmlFor="lr-tr-cohort">
    Long-read cohort
    <Select
      id="lr-tr-cohort"
      aria-label="Long-read cohort"
      value={cohort}
      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
        onCohortChange(event.target.value as LongReadCohort)
      }
    >
      <option value="hgsvc_hprc">HGSVC / HPRC</option>
      <option value="aou">All of Us</option>
    </Select>
  </CohortControl>
)

export const longReadTrLocusTitle = (locus: LongReadTrLocus) => {
  if (locus.presentation?.locus_type === 'VARIATION_CLUSTER') {
    return 'TR variation cluster'
  }
  if (!locus.primary_repeat?.motif) {
    const soleMotif = locus.components.length === 1 ? locus.components[0].motif : null
    return soleMotif ? `${soleMotif} tandem repeat` : 'Tandem-repeat locus'
  }
  const record =
    locus.primary_repeat.is_disease_associated_repeat &&
    locus.short_read_context?.status === 'EXACT_UNIQUE'
      ? locus.short_read_context.catalog_record
      : null
  if (record) {
    const gene = record.gene?.symbol
    const identity = gene && gene !== record.id ? `${record.id} (${gene})` : record.id
    return `${identity} ${locus.primary_repeat.motif} tandem repeat`
  }
  return `${locus.primary_repeat.motif} tandem repeat`
}

const LongReadTandemRepeatPage = ({
  datasetId: _datasetId,
  locus,
  requestedCohort,
  selectedAllele,
  revalidating = false,
  onCohortChange,
  onInvalidSelection,
  navigation,
}: {
  datasetId: DatasetId
  locus: LongReadTrLocus | null
  requestedCohort: LongReadCohort
  selectedAllele?: string
  revalidating?: boolean
  onCohortChange: (cohort: LongReadCohort) => void
  onInvalidSelection: () => void
  navigation: AlleleNavigation
}) => {
  const detail = useRef<HTMLElement | null>(null)
  const invalidHandled = useRef<string | null>(null)
  const revealInitialSelection = useRef(Boolean(selectedAllele))
  const restoreSelectedLinkFocus = useRef(false)
  const setDetail = useCallback((node: HTMLElement | null) => {
    detail.current = node
  }, [])

  useEffect(() => {
    if (
      !revalidating &&
      selectedAllele &&
      locus?.selected_allele_valid === false &&
      invalidHandled.current !== selectedAllele
    ) {
      invalidHandled.current = selectedAllele
      onInvalidSelection()
    }
  }, [locus?.selected_allele_valid, onInvalidSelection, revalidating, selectedAllele])

  useLayoutEffect(() => {
    if (revalidating) {
      restoreSelectedLinkFocus.current = true
      return
    }
    if (!restoreSelectedLinkFocus.current) return

    restoreSelectedLinkFocus.current = false
    if (!selectedAllele) return
    document
      .querySelector<HTMLElement>(
        '[data-testid="lr-tr-exact-allele-browser"] a[aria-current="page"]'
      )
      ?.focus()
  }, [locus?.selected_allele?.variant_id, revalidating, selectedAllele])

  useEffect(() => {
    if (revalidating) {
      revealInitialSelection.current = false
      return
    }
    if (
      !revealInitialSelection.current ||
      !selectedAllele ||
      locus?.selected_allele_valid == null
    ) {
      return
    }

    revealInitialSelection.current = false
    if (locus.selected_allele?.variant_id !== selectedAllele || !detail.current) return
    detail.current.focus()
    detail.current.scrollIntoView?.({ block: 'start' })
  }, [locus?.selected_allele, locus?.selected_allele_valid, revalidating, selectedAllele])

  const alleleById = useMemo(
    () => new Map((locus?.alleles.nodes || []).map((allele) => [allele.variant_id, allele])),
    [locus?.alleles.nodes]
  )

  if (!locus) {
    return (
      <>
        <DocumentTitle title="Tandem-repeat locus unavailable" />
        <Header>
          <PageHeading>Tandem-repeat locus unavailable</PageHeading>
          <CohortSelector cohort={requestedCohort} onCohortChange={onCohortChange} />
        </Header>
        <p role="status">
          This exact canonical locus is not available in the {cohortName(requestedCohort)} data.
          Data from another cohort were not substituted.
        </p>
      </>
    )
  }

  const envelope = trLocusDisplayEnvelope({
    components: locus.components,
    canonicalId: locus.id,
    sourceTrid: locus.source_trid,
  })
  // Retained story fixtures may predate the additive Phase 2 contracts. Live GraphQL always
  // supplies them; fixture fallbacks preserve the same fail-closed behavior.
  const rawPresentation = locus.presentation || {
    locus_type:
      locus.components.length === 1 ? ('ISOLATED_REPEAT' as const) : ('VARIATION_CLUSTER' as const),
  }
  // A multi-component locus is always cluster-focused: nothing can authorize a single primary
  // repeat for it.
  const presentation =
    locus.components.length > 1 && rawPresentation.locus_type === 'ISOLATED_REPEAT'
      ? {
          locus_type: 'VARIATION_CLUSTER' as const,
        }
      : rawPresentation
  const bounds = locus.bounds || {
    component_envelope_start0: locus.region.start0,
    component_envelope_end0: locus.region.end0,
    component_envelope_length_bp: locus.region.size,
    component_envelope_basis: 'EXACT_ORDERED_COMPONENTS' as const,
    source_ref_span_start0: null,
    source_ref_span_end0: null,
    source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT' as const,
  }
  const componentSummary = locus.component_summary || {
    ordered_component_count: locus.components.length,
    distinct_stored_motif_count: new Set(locus.components.map((component) => component.motif)).size,
  }
  const sequenceCardinality = locus.sequence_cardinality || {
    source_alt_identity_count: locus.exact_alt_count,
    unique_alt_sequence_count: null,
    all_source_alts_sequence_complete: false,
    status: 'UNAVAILABLE' as const,
    reason: locus.exact_alt_count_unavailable_reason,
    algorithm_version: 'UNAVAILABLE',
  }
  const representedLength = locus.represented_length || {
    status: 'UNAVAILABLE' as const,
    reason: locus.represented_allele_length_unavailable_reason,
    represented_ref_length_bp: null,
    represented_alt_min_length_bp: null,
    represented_alt_max_length_bp: null,
    source_delta_provenance: 'UNAVAILABLE' as const,
    sequence_length_provenance: null,
    sequence_source_record_digest: null,
    sequence_content_digest: null,
    anchor_rule: null,
    anchor_rule_source: null,
    anchor_rule_release: null,
    anchor_rule_digest: null,
    reconciliation_status: 'NOT_EVALUATED' as const,
  }
  const clusterFocused = presentation.locus_type === 'VARIATION_CLUSTER'
  const displayStart1 = envelope.start1
  const displayEnd1 = envelope.end1
  const exactContext = locus.short_read_context
  const primaryComponentIndex = locus.primary_repeat.component_index
  const authorizedExactReferenceComponentIndex =
    locus.primary_repeat.is_disease_associated_repeat &&
    primaryComponentIndex != null &&
    exactContext?.status === 'EXACT_UNIQUE' &&
    exactContext.exact_reference_component_outline_authorized === true &&
    exactContext.matched_component_index === primaryComponentIndex &&
    exactComponent(exactContext.matched_component, locus.components[primaryComponentIndex])
      ? primaryComponentIndex
      : null
  const title = longReadTrLocusTitle({ ...locus, presentation })
  const approvedCatalogRecord =
    locus.primary_repeat.is_disease_associated_repeat &&
    locus.short_read_context?.status === 'EXACT_UNIQUE'
      ? locus.short_read_context.catalog_record
      : null
  const absoluteRepresentedLengthAvailable =
    representedLength.status === 'AVAILABLE_EXACT' &&
    representedLength.represented_alt_min_length_bp != null &&
    representedLength.represented_alt_max_length_bp != null
  const alleleLengthRange =
    absoluteRepresentedLengthAvailable && locus.delta_min != null && locus.delta_max != null
      ? `${representedLength.represented_alt_min_length_bp!.toLocaleString()}–${representedLength.represented_alt_max_length_bp!.toLocaleString()} bp represented (${signed(
          locus.delta_min
        )} to ${signed(locus.delta_max)} bp versus REF)`
      : null
  const repeatPlotsAvailable = locus.repeat_count_plots.status === 'AVAILABLE_EXACT'
  // Compatibility for retained Phase 4–6 story fixtures. Live GraphQL always supplies
  // this non-null typed product field; an omitted fixture must remain fail-closed.
  const primaryMotifMeasurement = locus.primary_motif_measurement || {
    status: 'UNAVAILABLE' as const,
    reason_code: 'PUBLIC_PRODUCT_NOT_APPROVED' as const,
    motif: null,
    biological_role: null,
    metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1' as const,
    unit: 'EXACT_PRIMARY_MOTIF_UNITS' as const,
    scope: 'WHOLE_REPRESENTED_ALLELE' as const,
    called_alleles: null,
    reference_alleles: null,
    alternate_alleles: null,
    alternate_identities_checked: null,
    bins: [],
    genotype: {
      status: 'UNAVAILABLE' as const,
      reason_code: 'PRODUCT_INCOMPLETE' as const,
      called_diploid_people: null,
      no_call_people: null,
      cells: [],
    },
    provenance: null,
  }
  const localHaplotypeBackgroundsEnabled = isExperimentalFeatureEnabled('tr_haplotype_backgrounds')
  let selectedAlleleDetail: React.ReactNode
  if (locus.selected_allele) {
    selectedAlleleDetail = (
      <SelectedExactAlleleDetail
        ref={setDetail}
        allele={{
          ...locus.selected_allele,
          repeat_count:
            locus.selected_allele.repeat_count ||
            alleleById.get(locus.selected_allele.variant_id)?.repeat_count ||
            null,
          repeat_count_source:
            locus.selected_allele.repeat_count_source ||
            alleleById.get(locus.selected_allele.variant_id)?.repeat_count_source ||
            null,
          motif_purity:
            locus.selected_allele.motif_purity ??
            alleleById.get(locus.selected_allele.variant_id)?.motif_purity ??
            null,
        }}
        motifs={locus.motifs}
        representedLength={representedLength}
      />
    )
  } else if (selectedAllele && locus.selected_allele_valid !== false) {
    selectedAlleleDetail = (
      <p role="status">
        Exact ALT details unavailable: {unavailableReason(locus.selected_allele_unavailable_reason)}
        .
      </p>
    )
  }

  let spanLabel = 'Represented LR region length'
  if (clusterFocused) {
    spanLabel = 'Locus component-envelope length'
  } else if (locus.components.length === 1) {
    spanLabel = 'Reference interval size'
  }
  let spanValue = `${bounds.component_envelope_length_bp.toLocaleString()} bp`
  if (!clusterFocused && locus.components.length > 1 && alleleLengthRange) {
    spanValue = alleleLengthRange
  } else if (!clusterFocused && locus.components.length === 1 && locus.primary_repeat.motif) {
    const referenceRepeats = bounds.component_envelope_length_bp / locus.primary_repeat.motif.length
    spanValue = `${referenceRepeats.toFixed(1)} repeats (${spanValue})`
  }

  // Purity is only meaningful against one motif, so it follows the same
  // single-component condition as the reference interval size above. The REF
  // bytes come from the allele index nodes, which every other exact-sequence
  // reader on this page uses too. They all carry the same REF for a locus, and
  // are absent together when the locus sequence index exceeds the response
  // bound, in which case purity is simply not shown.
  const referencePurity =
    !clusterFocused && locus.components.length === 1
      ? referenceSequencePurity(
          referenceRepeatSequence(locus.alleles.nodes[0]?.ref),
          locus.primary_repeat.motif
        )
      : null

  return (
    <>
      <DocumentTitle title={title} />
      {selectedAllele && locus.selected_allele_valid === false && (
        <p role="alert">
          Requested exact ALT is not in this locus or cohort and was removed from the URL. Other
          settings are unchanged.
        </p>
      )}

      <Header>
        <HeadingWithHelp>
          <div>
            <HeadingWithHelp>
              <PageHeading>{title}</PageHeading>
              <LocusOverviewHelp />
            </HeadingWithHelp>
            <CoordinateContext>
              chr{envelope.chrom}:{displayStart1.toLocaleString()}–{displayEnd1.toLocaleString()}{' '}
              (GRCh38)
            </CoordinateContext>
          </div>
        </HeadingWithHelp>
        <CohortSelector cohort={requestedCohort} onCohortChange={onCohortChange} />
      </Header>

      <HeaderColumns>
        <HeaderColumn>
          <SourceAttributes>
            <AttributeList>
              {(locus.primary_repeat.motif || !clusterFocused) && (
                <AttributeListItem label="Motif">
                  {locus.primary_repeat.motif
                    ? `${locus.primary_repeat.motif} (${locus.primary_repeat.motif.length} bp)`
                    : 'Unavailable — source components remain in the disclosure below'}
                </AttributeListItem>
              )}
              <AttributeListItem label={spanLabel}>{spanValue}</AttributeListItem>
              {referencePurity != null && (
                <AttributeListItem
                  label="Reference sequence purity"
                  tooltip="Fraction of bases in the reference interval that match a pure repeat of the motif, phased to the interval's first base."
                >
                  {referencePurity.toFixed(2)}
                </AttributeListItem>
              )}
              {clusterFocused && (
                <>
                  <AttributeListItem label="Ordered source components">
                    {componentSummary.ordered_component_count.toLocaleString()}
                  </AttributeListItem>
                  <AttributeListItem label="Distinct stored motifs">
                    {componentSummary.distinct_stored_motif_count.toLocaleString()}
                  </AttributeListItem>
                </>
              )}
              {alleleLengthRange && (
                <AttributeListItem
                  label="Allele lengths"
                  tooltip="Represented absolute length is shown only when the API admits complete sequence-length provenance, padding rule, and reconciliation. Signed source delta remains a separate measurement."
                >
                  {alleleLengthRange}
                </AttributeListItem>
              )}
            </AttributeList>
          </SourceAttributes>
        </HeaderColumn>
        <HeaderColumn>
          <h2>External Resources</h2>
          <List>
            {approvedCatalogRecord?.strchive_id && (
              <ListItem>
                <ExternalLink href={strchiveLocusUrl(approvedCatalogRecord.strchive_id)}>
                  STRchive
                </ExternalLink>
              </ListItem>
            )}
            {approvedCatalogRecord?.stripy_id && (
              <ListItem>
                <ExternalLink href={stripyLocusUrl(approvedCatalogRecord.stripy_id)}>
                  STRipy
                </ExternalLink>
              </ListItem>
            )}
            <ListItem>
              <ExternalLink href={trExplorerRegionUrl(envelope.chrom, displayStart1, displayEnd1)}>
                TRExplorer
              </ExternalLink>
            </ListItem>
          </List>
        </HeaderColumn>
      </HeaderColumns>

      {clusterFocused && (
        <LongReadTrComponentTrack
          locus={locus}
          exactReferenceComponentIndex={authorizedExactReferenceComponentIndex}
          showTable={false}
        />
      )}

      <ShortReadKnownLocusContext lrCohort={locus.lr_cohort} context={locus.short_read_context} />

      <WholeRecordAlleleLandscape
        landscape={locus.whole_record_allele_landscape}
        genotypeLandscape={locus.whole_record_genotype_landscape}
        repeatCountPlots={repeatPlotsAvailable ? locus.repeat_count_plots : undefined}
        primaryMotifMeasurement={primaryMotifMeasurement}
        variantId={locus.id}
        markFilterScope={{
          locusId: locus.id,
          cohort: locus.lr_cohort,
          sourceRunId: locus.source_run_id,
        }}
        alleles={locus.alleles.nodes}
        motifs={locus.motifs}
        primaryMotif={locus.primary_repeat.motif}
        exactAltCountComplete={
          locus.exact_alt_count_complete &&
          !locus.alleles.page_info.has_next_page &&
          locus.total_alleles === locus.alleles.nodes.length
        }
        selectedAllele={selectedAllele}
        navigation={navigation}
        sequencesAvailable={locus.sequences_available}
        sequencesUnavailableReason={locus.sequences_unavailable_reason}
        selectedAlleleDetail={selectedAlleleDetail}
        presentation={presentation}
        sequenceCardinality={sequenceCardinality}
        representedLength={representedLength}
        filterContract={locus.filter_contract}
        sourceRecordOrder={locus.source_records.map((record) => record.source_variant_id)}
      />

      {localHaplotypeBackgroundsEnabled && (
        <LocalHaplotypeBackgroundsSection locus={locus} selectedAlleleId={selectedAllele} />
      )}

      {(locus.alleles.page_info.has_next_page ||
        locus.total_alleles > locus.alleles.nodes.length) && (
        <p role="alert">
          This locus has more exact ALT sequences than the page can display safely. Showing{' '}
          {locus.alleles.nodes.length.toLocaleString()} of {locus.total_alleles.toLocaleString()};
          distributions are hidden rather than calculated from incomplete data.
        </p>
      )}
    </>
  )
}

export default LongReadTandemRepeatPage
