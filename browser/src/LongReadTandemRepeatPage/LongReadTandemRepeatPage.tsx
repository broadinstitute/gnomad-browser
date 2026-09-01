import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { ExternalLink, PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'

import AttributeList, { AttributeListItem } from '../AttributeList'
import DocumentTitle from '../DocumentTitle'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import { isExperimentalFeatureEnabled } from '../experimentalFeatures'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadTrComponentTrack,
  motifColor,
  Panel,
  SelectedExactAlleleDetail,
  WholeRecordAlleleLandscape,
  signed,
  unavailableReason,
} from './LongReadTrVisualizations'
import ShortReadKnownLocusContext from './ShortReadKnownLocusContext'
import PrimaryMotifMeasurementSection from './PrimaryMotifMeasurementSection'
import LocalHaplotypeBackgroundsSection from './LocalHaplotypeBackgroundsSection'
import {
  strchiveLocusUrl,
  stripyLocusUrl,
  trExplorerGeneUrl,
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

const InlineResources = styled.span`
  a:not(:last-child) {
    margin-right: 1em;
  }
`

const PrimaryIdentity = styled.div`
  padding: 0.65em 0.8em;
  border-left: 4px solid #6f3c8f;
  margin-top: 0.75em;
  background: #f7f2fa;
  color: #3e2850;

  code {
    font-size: 1.08em;
    font-weight: bold;
  }
`

const SourceRepresentationDetails = styled.details`
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  padding: 0.65em 0.8em;
  border: 1px solid #d8dee2;
  margin-top: 2.4em;
  border-radius: 4px;
  color: #3e4b54;

  > summary {
    cursor: pointer;
    font-weight: bold;
  }

  code {
    overflow-wrap: anywhere;
    word-break: break-word;
  }
`

const RepeatMotifBadges = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35em;
`

const RepeatMotifBadge = styled.span`
  display: inline-block;
  padding: 0.12em 0.48em;
  border: 1px solid rgb(0 0 0 / 18%);
  border-radius: 0.3em;
  font-family: monospace;
  font-weight: bold;
  line-height: 1.35;
`

const UnavailableList = styled.ul`
  margin-bottom: 0;
`

const LocusOverviewHelp = () => (
  <HaplotypeHelpButton title="About this tandem-repeat locus">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> The canonical long-read locus, its ordered LR reference
      components, observed exact ALT sequences, aggregate plots, and any exact short-read catalog
      context.
    </p>
    <p>
      <strong>How to use it.</strong> Choose a long-read cohort, review the component track and
      assay-specific plots, then filter or select an exact ALT sequence in the Allelic landscape.
      Expand data source details only when technical provenance is needed.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> Short-read catalog labels and ranges do not classify
      long-read alleles, genotypes, components, people, or total allele length change.
    </p>
  </HaplotypeHelpButton>
)

const UnavailableDataHelp = () => (
  <HaplotypeHelpButton title="About unavailable data">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> Features that could not be displayed from the available data
      for this locus and cohort.
    </p>
    <p>
      <strong>How to use it.</strong> Read each reason, and continue using the sections that remain
      available. Changing the long-read cohort may change availability.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> Unavailable values are not zero and are never inferred
      from another measurement.
    </p>
  </HaplotypeHelpButton>
)

const cohortName = (cohort: LongReadCohort) =>
  cohort === 'hgsvc_hprc' ? 'HGSVC / HPRC' : 'All of Us'

const primaryRepeatBasisLabel = (basis: LongReadTrLocus['primary_repeat']['selection_basis']) => {
  if (basis === 'EXACT_MAIN_CATALOG_COMPONENT') return 'exact catalog / LR'
  if (basis === 'LR_SOLE_COMPONENT') return 'sole LR'
  return 'reviewed registry / LR'
}

const exactComponent = (left: any, right: any) =>
  Boolean(
    left &&
      right &&
      String(left.chrom).replace(/^chr/i, '') === String(right.chrom).replace(/^chr/i, '') &&
      left.start0 === right.start0 &&
      left.end0 === right.end0 &&
      left.motif === right.motif
  )

const primaryRepeatAuthorizationLabel = (
  basis: LongReadTrLocus['primary_repeat']['selection_basis']
) => {
  if (basis === 'EXACT_MAIN_CATALOG_COMPONENT') {
    return 'Exact short-read catalog main region and stored motif; no override registry used'
  }
  if (basis === 'LR_SOLE_COMPONENT') {
    return 'Sole ordered LR source component; no catalog or registry digest required'
  }
  return 'Future reviewed primary-repeat registry entry'
}

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
  if (locus.primary_repeat?.status !== 'AVAILABLE' || !locus.primary_repeat.motif) {
    return 'Tandem-repeat locus'
  }
  const record =
    locus.short_read_context?.status === 'EXACT_UNIQUE' &&
    locus.short_read_context.catalog_record?.id === locus.primary_repeat.catalog_id
      ? locus.short_read_context.catalog_record
      : null
  if (record) {
    const gene = record.gene?.symbol
    const identity = gene && gene !== record.id ? `${record.id} (${gene})` : record.id
    return `${identity} ${locus.primary_repeat.motif} tandem repeat`
  }
  return `${locus.primary_repeat.motif} tandem repeat`
}

const badgeTextColor = (background: string) => {
  const channels = background
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  const whiteContrast = 1.05 / (luminance + 0.05)
  const blackContrast = (luminance + 0.05) / 0.05
  return whiteContrast >= blackContrast ? '#fff' : '#111'
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
  const orderedMotifs = locus.components.map((component) => component.motif)
  const vocabulary = [...new Set(locus.motifs.length ? locus.motifs : orderedMotifs)]
  const exactContext = locus.short_read_context
  const primaryComponentIndex = locus.primary_repeat.component_index
  const authorizedExactReferenceComponentIndex =
    locus.primary_repeat.status === 'AVAILABLE' &&
    locus.primary_repeat.selection_basis === 'EXACT_MAIN_CATALOG_COMPONENT' &&
    primaryComponentIndex != null &&
    exactContext?.status === 'EXACT_UNIQUE' &&
    exactContext.exact_reference_component_outline_authorized === true &&
    exactContext.matched_component_index === primaryComponentIndex &&
    exactContext.catalog_record?.id === locus.primary_repeat.catalog_id &&
    exactContext.catalog_digest === locus.primary_repeat.catalog_digest &&
    exactComponent(locus.components[primaryComponentIndex], locus.primary_repeat.component) &&
    exactComponent(exactContext.matched_component, locus.primary_repeat.component)
      ? primaryComponentIndex
      : null
  const title = longReadTrLocusTitle(locus)
  const approvedCatalogRecord =
    locus.primary_repeat.status === 'AVAILABLE' &&
    locus.short_read_context?.status === 'EXACT_UNIQUE' &&
    locus.short_read_context.catalog_record?.id === locus.primary_repeat.catalog_id
      ? locus.short_read_context.catalog_record
      : null
  const alleleLengthRange =
    locus.represented_allele_length_min == null ||
    locus.represented_allele_length_max == null ||
    locus.delta_min == null ||
    locus.delta_max == null
      ? `Unavailable: ${unavailableReason(
          locus.represented_allele_length_unavailable_reason || locus.delta_unavailable_reason
        )}`
      : `${locus.represented_allele_length_min.toLocaleString()}–${locus.represented_allele_length_max.toLocaleString()} bp (${signed(
          locus.delta_min
        )} to ${signed(locus.delta_max)} bp)`
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
  const unavailableData: { label: string; reason: string }[] = []
  if (!repeatPlotsAvailable) {
    unavailableData.push({
      label: 'Component repeat counts',
      reason:
        locus.components.length > 1
          ? 'compound loci do not have one unambiguous component repeat count'
          : unavailableReason(locus.repeat_count_plots.reason_code),
    })
  }
  if (primaryMotifMeasurement.status !== 'AVAILABLE') {
    unavailableData.push({
      label: 'Whole-record exact primary-motif measurement',
      reason:
        primaryMotifMeasurement.reason_code === 'PUBLIC_PRODUCT_NOT_APPROVED'
          ? 'the candidate primary-motif registry and product are not approved for public display'
          : unavailableReason(primaryMotifMeasurement.reason_code),
    })
  }
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
              chr{envelope.chrom}:{envelope.start1.toLocaleString()}–
              {envelope.end1.toLocaleString()} (GRCh38)
            </CoordinateContext>
            {locus.primary_repeat.status === 'AVAILABLE' && locus.primary_repeat.motif ? (
              <PrimaryIdentity aria-label={`Primary repeat ${locus.primary_repeat.motif}`}>
                <strong>Primary repeat</strong> <code>{locus.primary_repeat.motif}</code> ·{' '}
                {primaryRepeatBasisLabel(locus.primary_repeat.selection_basis)} component{' '}
                {(locus.primary_repeat.component_index || 0) + 1}
                {locus.primary_repeat.biological_role && (
                  <> · {locus.primary_repeat.biological_role}</>
                )}
              </PrimaryIdentity>
            ) : (
              <PrimaryIdentity role="status">
                <strong>Primary repeat unavailable.</strong> No motif or component was inferred or
                substituted
                {locus.primary_repeat.reason_code
                  ? ` (${unavailableReason(locus.primary_repeat.reason_code)})`
                  : ''}
                .
              </PrimaryIdentity>
            )}
          </div>
        </HeadingWithHelp>
        <CohortSelector cohort={requestedCohort} onCohortChange={onCohortChange} />
      </Header>

      <SourceAttributes>
        <AttributeList>
          <AttributeListItem label="Region size">
            {locus.region.size.toLocaleString()} bp
          </AttributeListItem>
          <AttributeListItem label="Primary repeat identity">
            {locus.primary_repeat.status === 'AVAILABLE' && locus.primary_repeat.motif ? (
              <RepeatMotifBadges aria-label={`Primary repeat: ${locus.primary_repeat.motif}`}>
                <RepeatMotifBadge
                  data-motif-badge={locus.primary_repeat.motif}
                  data-motif-color={motifColor(locus.primary_repeat.motif, locus.motifs)}
                  style={{
                    backgroundColor: motifColor(locus.primary_repeat.motif, locus.motifs),
                    color: badgeTextColor(motifColor(locus.primary_repeat.motif, locus.motifs)),
                  }}
                >
                  {locus.primary_repeat.motif}
                </RepeatMotifBadge>
              </RepeatMotifBadges>
            ) : (
              'Unavailable — source components remain in the disclosure below'
            )}
          </AttributeListItem>
          {approvedCatalogRecord?.gene?.symbol && approvedCatalogRecord.gene.region && (
            <AttributeListItem label="Gene context">
              {approvedCatalogRecord.gene.symbol} — {approvedCatalogRecord.gene.region}
            </AttributeListItem>
          )}
          <AttributeListItem
            label="Allele copies with a genotype call"
            tooltip="The frequency denominator: chromosome copies with a genotype call at this locus. An allele copy is not a person; a person may contribute more than one copy depending on chromosome and ploidy."
          >
            {locus.called_allele_count == null
              ? 'Unavailable'
              : `${locus.called_allele_count.toLocaleString()} allele copies`}
          </AttributeListItem>
          <AttributeListItem
            label="Observed exact ALT sequences"
            tooltip="Each exact ALT sequence is one distinct source identity. Use this count to decide which reported sequence to inspect; it does not group biologically similar sequences."
          >
            {locus.exact_alt_count_complete
              ? `${locus.exact_alt_count.toLocaleString()} exact ALT ${
                  locus.exact_alt_count === 1 ? 'sequence' : 'sequences'
                }`
              : `Unavailable: ${unavailableReason(locus.exact_alt_count_unavailable_reason)}`}
          </AttributeListItem>
          <AttributeListItem
            label="Allele length range (ALT − REF)"
            tooltip="Absolute lengths include the complete REF and represented ALT sequences. Parentheses show each ALT's signed base-pair change from its complete REF. The range is unavailable if the exact sequence index is incomplete or exceeds its response bound."
          >
            {alleleLengthRange}
          </AttributeListItem>
          {approvedCatalogRecord && (
            <AttributeListItem label="External resources">
              <InlineResources>
                {approvedCatalogRecord.strchive_id && (
                  <ExternalLink href={strchiveLocusUrl(approvedCatalogRecord.strchive_id)}>
                    STRchive
                  </ExternalLink>
                )}
                {approvedCatalogRecord.stripy_id && (
                  <ExternalLink href={stripyLocusUrl(approvedCatalogRecord.stripy_id)}>
                    STRipy
                  </ExternalLink>
                )}
                {approvedCatalogRecord.gene?.symbol && (
                  <ExternalLink href={trExplorerGeneUrl(approvedCatalogRecord.gene.symbol)}>
                    TRExplorer
                  </ExternalLink>
                )}
              </InlineResources>
            </AttributeListItem>
          )}
        </AttributeList>
      </SourceAttributes>

      <ShortReadKnownLocusContext
        locusId={locus.id}
        lrCohort={locus.lr_cohort}
        context={locus.short_read_context}
      />

      <PrimaryMotifMeasurementSection measurement={primaryMotifMeasurement} />

      <WholeRecordAlleleLandscape
        landscape={locus.whole_record_allele_landscape}
        genotypeLandscape={repeatPlotsAvailable ? undefined : locus.whole_record_genotype_landscape}
        repeatCountPlots={repeatPlotsAvailable ? locus.repeat_count_plots : undefined}
        variantId={locus.id}
        markFilterScope={{
          locusId: locus.id,
          cohort: locus.lr_cohort,
          sourceRunId: locus.source_run_id,
        }}
        alleles={locus.alleles.nodes}
        motifs={locus.motifs}
        selectedAllele={selectedAllele}
        navigation={navigation}
        sequencesAvailable={locus.sequences_available}
        sequencesUnavailableReason={locus.sequences_unavailable_reason}
        selectedAlleleDetail={selectedAlleleDetail}
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

      {unavailableData.length > 0 && (
        <Panel aria-labelledby="lr-tr-unavailable-heading">
          <HeadingWithHelp>
            <h2 id="lr-tr-unavailable-heading">Unavailable data</h2>
            <UnavailableDataHelp />
          </HeadingWithHelp>
          <UnavailableList>
            {unavailableData.map(({ label, reason }) => (
              <li key={label}>
                <strong>{label}:</strong> {reason}
              </li>
            ))}
          </UnavailableList>
        </Panel>
      )}

      <SourceRepresentationDetails open={locus.primary_repeat.status !== 'AVAILABLE'}>
        <summary>
          LR source representation and provenance — {locus.components.length} ordered{' '}
          {locus.components.length === 1 ? 'component' : 'components'}
        </summary>
        <AttributeList>
          <AttributeListItem label={vocabulary.length === 1 ? 'Repeat motif' : 'Repeat motifs'}>
            {vocabulary.length ? (
              <RepeatMotifBadges aria-label={`Repeat motifs: ${vocabulary.join(', ')}`}>
                {vocabulary.map((motif) => {
                  const color = motifColor(motif, locus.motifs)
                  return (
                    <RepeatMotifBadge
                      key={motif}
                      data-motif-badge={motif}
                      data-motif-color={color}
                      style={{ backgroundColor: color, color: badgeTextColor(color) }}
                    >
                      {motif}
                    </RepeatMotifBadge>
                  )
                })}
              </RepeatMotifBadges>
            ) : (
              'Unavailable'
            )}
          </AttributeListItem>
        </AttributeList>
        <LongReadTrComponentTrack
          locus={locus}
          exactReferenceComponentIndex={authorizedExactReferenceComponentIndex}
        />
        <AttributeList>
          <AttributeListItem label="Tandem-repeat identifier">
            <code>{locus.source_trid}</code>
          </AttributeListItem>
          <AttributeListItem label="Variant records">
            {locus.source_records.map((record, index) => (
              <React.Fragment key={record.source_variant_id}>
                {index > 0 && ', '}
                <code>{record.source_variant_id}</code> (record {record.record_index}; task{' '}
                <code>{record.task_id || 'unavailable'}</code>; attempt{' '}
                <code>{record.attempt_id || 'unavailable'}</code>;{' '}
                {record.alt_count.toLocaleString()} alternate alleles)
              </React.Fragment>
            ))}
          </AttributeListItem>
          <AttributeListItem label="Release / processing run">
            {locus.source_release} / <code>{locus.source_run_id}</code>
          </AttributeListItem>
          {locus.primary_repeat.status === 'AVAILABLE' && (
            <AttributeListItem label="Primary-repeat authorization">
              {primaryRepeatAuthorizationLabel(locus.primary_repeat.selection_basis)}
            </AttributeListItem>
          )}
          {locus.primary_repeat.catalog_digest && (
            <AttributeListItem label="Exact short-read catalog digest">
              <code>{locus.primary_repeat.catalog_digest}</code>
            </AttributeListItem>
          )}
          {locus.primary_repeat.selection_basis === 'REVIEWED_PRIMARY_REPEAT_REGISTRY' &&
            locus.primary_repeat.registry_digest && (
              <AttributeListItem label="Reviewed primary-repeat registry digest">
                <code>{locus.primary_repeat.registry_digest}</code>
              </AttributeListItem>
            )}
        </AttributeList>
      </SourceRepresentationDetails>
    </>
  )
}

export default LongReadTandemRepeatPage
