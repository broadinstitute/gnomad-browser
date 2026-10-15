import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { ExternalLink, List, ListItem, Modal, PageHeading, Select, TextButton } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'
import {
  MAX_MOTIF_LENGTH_TO_PRINT_IN_FULL,
  shortenLongMotifToItsEnds,
} from '@gnomad/dataset-metadata/longReadTrLocusPresentation'

import AttributeList, { AttributeListItem } from '../AttributeList'
import DocumentTitle from '../DocumentTitle'
import { isExperimentalFeatureEnabled } from '../experimentalFeatures'
import { ModalZIndexFix } from '../Haplotypes/HelpButton'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadTrComponentTrack,
  locusRegionWithSourceRefSpan,
  SelectedExactAlleleDetail,
  WholeRecordAlleleLandscape,
  signed,
  unavailableReason,
} from './LongReadTrVisualizations'
import ShortReadKnownLocusContext from './ShortReadKnownLocusContext'
import LocalHaplotypeBackgroundsSection from './LocalHaplotypeBackgroundsSection'
import {
  strchiveLocusUrl,
  stripyLocusUrl,
  trExplorerRegionUrl,
  ucscBrowserUrlHighlightingRegion,
} from '../ShortTandemRepeatPage/externalResourceUrls'
import { variantFeedbackUrl } from '../variantFeedback'
import { AlleleNavigation, LongReadTrLocus } from './types'

// @gnomad/ui's PageHeading renders its renderPageControls prop at the right end of the heading
// line, but the library's type definitions misspell that prop as renderPageControl.
const PageHeadingWithControls = PageHeading as React.ComponentType<{
  children: React.ReactNode
  renderPageControls: () => React.ReactNode
}>

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

  /* lines "External Resources" up with the coordinates at the top of the left column */
  > h2:first-child {
    margin-top: 0;
  }

  @media (max-width: 992px) {
    width: 100%;
  }
`

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

// A long motif is named by its size, as in the gene table rows, so the heading stays short:
// "Tandem Repeat: CAG" but "Tandem Repeat: 99bp motif".
const tandemRepeatHeadingForMotif = (motif: string) =>
  motif.length > MAX_MOTIF_LENGTH_TO_PRINT_IN_FULL
    ? `Tandem Repeat: ${motif.length}bp motif`
    : `Tandem Repeat: ${motif}`

const FullMotifSequence = styled.code`
  display: block;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
`

// A long motif keeps only its first and last bases. The full sequence shows on hover, and
// clicking opens it in a dialog where it can be read and selected.
const MotifAttributeValue = ({ motif }: { motif: string }) => {
  const [isFullMotifDialogOpen, setIsFullMotifDialogOpen] = useState(false)
  if (motif.length <= MAX_MOTIF_LENGTH_TO_PRINT_IN_FULL) {
    return <>{`${motif} (${motif.length} bp)`}</>
  }
  return (
    <>
      <TextButton title={motif} onClick={() => setIsFullMotifDialogOpen(true)}>
        {shortenLongMotifToItsEnds(motif)}
      </TextButton>{' '}
      ({motif.length} bp)
      {isFullMotifDialogOpen && (
        <>
          <ModalZIndexFix />
          <Modal
            title={`Motif (${motif.length} bp)`}
            size="large"
            onRequestClose={() => setIsFullMotifDialogOpen(false)}
          >
            <FullMotifSequence>{motif}</FullMotifSequence>
          </Modal>
        </>
      )}
    </>
  )
}

export const longReadTrLocusTitle = (locus: LongReadTrLocus) => {
  if (locus.presentation?.locus_type === 'VARIATION_CLUSTER') {
    return 'TR variation cluster'
  }
  if (!locus.primary_repeat?.motif) {
    const soleMotif = locus.components.length === 1 ? locus.components[0].motif : null
    return soleMotif ? tandemRepeatHeadingForMotif(soleMotif) : 'Tandem-repeat locus'
  }
  const record =
    locus.primary_repeat.is_disease_associated_repeat &&
    locus.short_read_context?.status === 'EXACT_UNIQUE'
      ? locus.short_read_context.catalog_record
      : null
  if (record) {
    const gene = record.gene?.symbol
    const identity = gene && gene !== record.id ? `${record.id} (${gene})` : record.id
    return `${identity} ${tandemRepeatHeadingForMotif(locus.primary_repeat.motif)}`
  }
  return tandemRepeatHeadingForMotif(locus.primary_repeat.motif)
}

const LongReadTandemRepeatPage = ({
  datasetId,
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
  // Set once an invalid requested allele has been removed from the URL, so the notice stays up
  // after the page reloads without it, until another allele is selected.
  const [invalidAlleleRemoved, setInvalidAlleleRemoved] = useState(false)
  const revealInitialSelection = useRef(Boolean(selectedAllele))
  const restoreSelectedLinkFocus = useRef(false)
  const setDetail = useCallback((node: HTMLElement | null) => {
    detail.current = node
  }, [])

  // The notice is about one locus and cohort; another one starts without it.
  useEffect(() => {
    setInvalidAlleleRemoved(false)
  }, [locus?.id, locus?.lr_cohort])
  // A valid selection ends the notice, so going back to no selection does not bring it back. The
  // render just before the invalid allele leaves the URL still has selected_allele_valid false.
  useEffect(() => {
    if (selectedAllele && locus?.selected_allele_valid !== false) setInvalidAlleleRemoved(false)
  }, [locus?.selected_allele_valid, selectedAllele])

  useEffect(() => {
    if (
      !revalidating &&
      selectedAllele &&
      locus?.selected_allele_valid === false &&
      invalidHandled.current !== selectedAllele
    ) {
      invalidHandled.current = selectedAllele
      setInvalidAlleleRemoved(true)
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

  if (!locus) {
    return (
      <>
        <DocumentTitle title="Tandem-repeat locus unavailable" />
        <PageHeadingWithControls
          renderPageControls={() => (
            <CohortSelector cohort={requestedCohort} onCohortChange={onCohortChange} />
          )}
        >
          Tandem-repeat locus unavailable
        </PageHeadingWithControls>
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
  // A multi-component locus is always cluster-focused: nothing can authorize a single primary
  // repeat for it.
  const presentation =
    locus.components.length > 1 && locus.presentation.locus_type === 'ISOLATED_REPEAT'
      ? {
          locus_type: 'VARIATION_CLUSTER' as const,
        }
      : locus.presentation
  const {
    bounds,
    sequence_cardinality: sequenceCardinality,
    represented_length: representedLength,
    primary_motif_measurement: primaryMotifMeasurement,
  } = locus
  const clusterFocused = presentation.locus_type === 'VARIATION_CLUSTER'
  // A cluster page describes the whole cluster: the source record's REF span when the API
  // supplies it, which can reach beyond the components.
  const clusterRegion =
    clusterFocused && bounds.source_ref_span_status === 'AVAILABLE_EXACT'
      ? locusRegionWithSourceRefSpan(locus)
      : null
  const displayStart1 = clusterRegion ? clusterRegion.start0 + 1 : envelope.start1
  const displayEnd1 = clusterRegion ? clusterRegion.end0 : envelope.end1
  // The heading shows the interval zero-based half-open, matching the locus id and
  // the tandem repeat rows. The envelope's end1 is already the exclusive end0, so
  // only the start moves. displayStart1 stays one-based for the TRExplorer link,
  // whose search box expects one-based inclusive.
  const displayStart0 = displayStart1 - 1
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
  const localHaplotypeBackgroundsEnabled = isExperimentalFeatureEnabled('tr_haplotype_backgrounds')
  let selectedAlleleDetail: React.ReactNode
  if (locus.selected_allele) {
    selectedAlleleDetail = (
      <SelectedExactAlleleDetail
        ref={setDetail}
        allele={locus.selected_allele}
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

  // A locus with more than one component is always a variation cluster, so a page that is not
  // cluster-focused has exactly one component. Its motif stands in for the primary repeat's when
  // that identity is unavailable, as in the title.
  const singleRepeatMotif = clusterFocused
    ? null
    : locus.primary_repeat.motif || locus.components[0]?.motif || null
  let spanLabel = 'Reference interval size'
  if (clusterRegion) {
    spanLabel = 'Cluster length'
  } else if (clusterFocused) {
    spanLabel = 'Locus component-envelope length'
  }
  let spanValue = `${(clusterRegion
    ? clusterRegion.size
    : bounds.component_envelope_length_bp
  ).toLocaleString()} bp`
  if (singleRepeatMotif) {
    const referenceRepeats = bounds.component_envelope_length_bp / singleRepeatMotif.length
    spanValue = `${referenceRepeats.toFixed(1)} repeats (${spanValue})`
  }

  // TRGT's purity for the REF, the value of the purity plot's REF dot. The line is hidden when
  // the API has none for this locus.
  const referencePurity = locus.whole_record_allele_landscape.reference_purity ?? null

  return (
    <>
      <DocumentTitle title={title} />
      {((selectedAllele && locus.selected_allele_valid === false) ||
        (invalidAlleleRemoved && !selectedAllele)) && (
        <p role="alert">
          Requested exact ALT is not in this locus or cohort and was removed from the URL. Other
          settings are unchanged.
        </p>
      )}

      <PageHeadingWithControls
        renderPageControls={() => (
          <CohortSelector cohort={requestedCohort} onCohortChange={onCohortChange} />
        )}
      >
        {title}
      </PageHeadingWithControls>

      <HeaderColumns>
        <HeaderColumn>
          <CoordinateContext>
            chr{envelope.chrom}:{displayStart0.toLocaleString()}–{displayEnd1.toLocaleString()}{' '}
            (GRCh38)
          </CoordinateContext>
          <SourceAttributes>
            <AttributeList>
              <AttributeListItem label={spanLabel}>{spanValue}</AttributeListItem>
              {referencePurity != null && (
                <AttributeListItem
                  label="Reference sequence purity"
                  tooltip="Allele purity (AP) as reported by TRGT: the fraction of the REF allele's bases that match perfect copies of this locus's motifs, after TRGT aligns the allele to them. Bases that fit no motif copy, such as spacer sequence between repeats, count as mismatches."
                >
                  {referencePurity.toFixed(2)}
                </AttributeListItem>
              )}
              {alleleLengthRange && (
                <AttributeListItem label="Allele lengths">{alleleLengthRange}</AttributeListItem>
              )}
              {(locus.primary_repeat.motif || singleRepeatMotif) && (
                <AttributeListItem label="Motif">
                  <MotifAttributeValue motif={locus.primary_repeat.motif || singleRepeatMotif!} />
                </AttributeListItem>
              )}
            </AttributeList>
          </SourceAttributes>
        </HeaderColumn>
        <HeaderColumn>
          <h2>External Resources</h2>
          <List>
            <ListItem>
              <ExternalLink
                href={ucscBrowserUrlHighlightingRegion(envelope.chrom, displayStart1, displayEnd1)}
              >
                UCSC
              </ExternalLink>
            </ListItem>
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
          <h2>Feedback</h2>
          <ExternalLink href={variantFeedbackUrl({ variant_id: locus.id }, datasetId)}>
            Report an issue with this tandem repeat
          </ExternalLink>
        </HeaderColumn>
      </HeaderColumns>

      {clusterFocused && (
        <LongReadTrComponentTrack
          locus={locus}
          exactReferenceComponentIndex={authorizedExactReferenceComponentIndex}
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

      {/* A locus whose ALT alleles could not all be read lists none of them. One with more ALTs
          than the table holds lists its most common ones, which the table itself notes. */}
      {!locus.exact_alt_count_complete && locus.total_alleles > locus.alleles.nodes.length && (
        <p role="alert">
          No ALT alleles are listed because{' '}
          {unavailableReason(locus.exact_alt_count_unavailable_reason)}.
        </p>
      )}
    </>
  )
}

export default LongReadTandemRepeatPage
