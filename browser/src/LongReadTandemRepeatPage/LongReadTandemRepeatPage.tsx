import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'

import AttributeList, { AttributeListItem } from '../AttributeList'
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
import ShortReadReferenceCohortSection from './ShortReadReferenceCohortSection'
import LocalHaplotypeBackgroundsSection from './LocalHaplotypeBackgroundsSection'
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

const SourceAttributes = styled.div`
  margin-top: 1em;
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

const ProvenanceDetails = styled.details`
  margin-top: 2.4em;

  summary {
    cursor: pointer;
    font-weight: bold;
  }
`

const LocusOverviewHelp = () => (
  <HaplotypeHelpButton title="About this tandem-repeat locus">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> The canonical long-read locus, its ordered LR reference
      components, observed exact alleles, aggregate plots, and any exact short-read catalog context.
    </p>
    <p>
      <strong>How to use it.</strong> Choose a long-read cohort, review the component track and
      assay-specific plots, then filter or select an exact allele in the Allelic landscape. Expand
      data source details only when technical provenance is needed.
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
  selectedAllele,
  onCohortChange,
  onInvalidSelection,
  navigation,
}: {
  datasetId: DatasetId
  locus: LongReadTrLocus | null
  selectedAllele?: string
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
      selectedAllele &&
      locus?.selected_allele_valid === false &&
      invalidHandled.current !== selectedAllele
    ) {
      invalidHandled.current = selectedAllele
      onInvalidSelection()
    }
  }, [locus?.selected_allele_valid, onInvalidSelection, selectedAllele])

  useEffect(() => {
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
  }, [locus?.selected_allele, locus?.selected_allele_valid, selectedAllele])

  const alleleById = useMemo(
    () => new Map((locus?.alleles.nodes || []).map((allele) => [allele.variant_id, allele])),
    [locus?.alleles.nodes]
  )

  if (!locus) return <p role="alert">No tandem-repeat locus found in this cohort.</p>

  const envelope = trLocusDisplayEnvelope({
    components: locus.components,
    canonicalId: locus.id,
    sourceTrid: locus.source_trid,
  })
  const orderedMotifs = locus.components.map((component) => component.motif)
  const vocabulary = [...new Set(locus.motifs.length ? locus.motifs : orderedMotifs)]
  const authorizedExactReferenceComponentIndex =
    locus.short_read_context?.status === 'EXACT_UNIQUE' &&
    locus.short_read_context.exact_reference_component_outline_authorized
      ? locus.short_read_context.matched_component_index
      : null
  const deltaRange =
    locus.delta_min == null || locus.delta_max == null
      ? `Unavailable: ${unavailableReason(locus.delta_unavailable_reason)}`
      : `${signed(locus.delta_min)} to ${signed(locus.delta_max)} bp`
  const repeatPlotsAvailable = locus.repeat_count_plots.status === 'AVAILABLE_EXACT'
  const localHaplotypeBackgroundsEnabled = isExperimentalFeatureEnabled(
    'tr_haplotype_backgrounds'
  )
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
        Exact allele details unavailable:{' '}
        {unavailableReason(locus.selected_allele_unavailable_reason)}.
      </p>
    )
  }

  return (
    <>
      {selectedAllele && locus.selected_allele_valid === false && (
        <p role="alert">
          Requested exact allele is not in this locus or cohort and was removed from the URL. Other
          settings are unchanged.
        </p>
      )}

      <Header>
        <HeadingWithHelp>
          <PageHeading>
            Tandem repeat at chr{envelope.chrom}:{envelope.start1.toLocaleString()}–
            {envelope.end1.toLocaleString()}
          </PageHeading>
          <LocusOverviewHelp />
        </HeadingWithHelp>
        <CohortControl htmlFor="lr-tr-cohort">
          Long-read cohort
          <Select
            id="lr-tr-cohort"
            aria-label="Long-read cohort"
            value={locus.lr_cohort}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onCohortChange(event.target.value as LongReadCohort)
            }
          >
            <option value="hgsvc_hprc">HGSVC / HPRC</option>
            <option value="aou">All of Us</option>
          </Select>
        </CohortControl>
      </Header>

      <SourceAttributes>
        <AttributeList>
          <AttributeListItem label="Genome build">GRCh38 / hg38</AttributeListItem>
          <AttributeListItem label="Region size">
            {locus.region.size.toLocaleString()} bp
          </AttributeListItem>
          <AttributeListItem label="Repeat motifs">
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
          <AttributeListItem label="Cohort">
            {cohortName(locus.lr_cohort)}
            {locus.called_sample_count != null &&
              ` — ${locus.called_sample_count.toLocaleString()} individuals`}
            {locus.called_allele_count != null &&
              `; ${locus.called_allele_count.toLocaleString()} called allele copies`}
          </AttributeListItem>
          <AttributeListItem label="Observed alleles">
            {locus.exact_alt_count_complete
              ? `${locus.exact_alt_count.toLocaleString()} exact alleles`
              : `Unavailable: ${unavailableReason(locus.exact_alt_count_unavailable_reason)}`}
          </AttributeListItem>
          <AttributeListItem label="Total allele length change (ALT − REF, bp)">
            {deltaRange}
          </AttributeListItem>
        </AttributeList>
      </SourceAttributes>

      <LongReadTrComponentTrack
        locus={locus}
        exactReferenceComponentIndex={authorizedExactReferenceComponentIndex}
      />

      <ShortReadKnownLocusContext context={locus.short_read_context} />

      <ShortReadReferenceCohortSection
        locusId={locus.id}
        lrCohort={locus.lr_cohort}
        context={locus.short_read_context}
      />

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
          This locus has more exact alleles than the page can display safely. Showing{' '}
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

      <ProvenanceDetails>
        <summary>Data source details</summary>
        <AttributeList>
          <AttributeListItem label="Tandem-repeat identifier">
            <code>{locus.source_trid}</code>
          </AttributeListItem>
          <AttributeListItem label="Variant records">
            {locus.source_records.map((record, index) => (
              <React.Fragment key={record.source_variant_id}>
                {index > 0 && ', '}
                <code>{record.source_variant_id}</code> (record {record.record_index};{' '}
                {record.alt_count.toLocaleString()} alternate alleles)
              </React.Fragment>
            ))}
          </AttributeListItem>
          <AttributeListItem label="Release / processing run">
            {locus.source_release} / <code>{locus.source_run_id}</code>
          </AttributeListItem>
        </AttributeList>
      </ProvenanceDetails>
    </>
  )
}

export default LongReadTandemRepeatPage
