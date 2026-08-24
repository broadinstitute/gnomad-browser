import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'

import AttributeList, { AttributeListItem } from '../AttributeList'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
import Link from '../Link'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'
import {
  LongReadTrComponentTrack,
  Panel,
  SelectedExactAlleleDetail,
  WholeRecordAlleleLandscape,
  WholeRecordGenotypeLandscape,
  signed,
  unavailableReason,
} from './LongReadTrVisualizations'
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

const SimpleLocusPlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, calc(50% - 0.625em)));
  align-items: start;
  gap: 1.25em;
  margin-top: 1.25em;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 100%);
  }
`

const SimpleLocusPlotCard = styled.div`
  min-width: 0;
  padding: 1em;
  border: 1px solid #d8dee2;
  border-radius: 4px;
  background: #fbfcfd;

  h3 {
    margin-top: 0;
  }

  > div:first-of-type {
    margin-right: auto;
    margin-left: auto;
  }
`

const cohortName = (cohort: LongReadCohort) =>
  cohort === 'hgsvc_hprc' ? 'HGSVC / HPRC' : 'All of Us'

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
  const vocabulary = [...new Set(orderedMotifs)]
  const knownLocus = locus.short_read_matches[0]
  const deltaRange =
    locus.delta_min == null || locus.delta_max == null
      ? `Unavailable: ${unavailableReason(locus.delta_unavailable_reason)}`
      : `${signed(locus.delta_min)} to ${signed(locus.delta_max)} bp`
  const repeatPlotsAvailable = locus.repeat_count_plots.status === 'AVAILABLE_EXACT'
  const unavailableData: { label: string; reason: string }[] = []
  if (!locus.sequences_available) {
    unavailableData.push({
      label: 'Exact-ALT index motif previews',
      reason: unavailableReason(locus.sequences_unavailable_reason),
    })
  }
  if (selectedAllele && locus.selected_allele_valid !== false && !locus.selected_allele) {
    unavailableData.push({
      label: 'Selected exact sequence/detail',
      reason: unavailableReason(locus.selected_allele_unavailable_reason),
    })
  }
  if (!repeatPlotsAvailable) {
    unavailableData.push({
      label: 'Component repeat counts',
      reason:
        locus.component_measurement_unavailable_reason ||
        unavailableReason(locus.repeat_count_plots.reason_code),
    })
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
        <div>
          <PageHeading>
            Tandem repeat at chr{envelope.chrom}:{envelope.start1.toLocaleString()}–
            {envelope.end1.toLocaleString()}
          </PageHeading>
        </div>
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
            {vocabulary.join(', ') || 'Unavailable'}
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
              ? `${locus.exact_alt_count.toLocaleString()} alleles; ${deltaRange}`
              : `Unavailable: ${unavailableReason(locus.exact_alt_count_unavailable_reason)}`}
          </AttributeListItem>
          <AttributeListItem label="Source record">
            {locus.source_records.map((record, index) => (
              <React.Fragment key={record.source_variant_id}>
                {index > 0 && ', '}
                <code>{record.source_variant_id}</code>
              </React.Fragment>
            ))}
          </AttributeListItem>
          {knownLocus && (
            <AttributeListItem label="Short-read context">
              <Link
                to={`/short-tandem-repeat/${knownLocus.id}?dataset=gnomad_r4`}
                preserveSelectedDataset={false}
              >
                {knownLocus.gene_symbol || knownLocus.id} short-read details
              </Link>
            </AttributeListItem>
          )}
        </AttributeList>
      </SourceAttributes>

      <LongReadTrComponentTrack locus={locus} />

      {repeatPlotsAvailable && (
        <Panel aria-labelledby="lr-tr-simple-measurement-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <h2 id="lr-tr-simple-measurement-heading" style={{ marginRight: 0 }}>
              Simple-locus repeat counts
            </h2>
            <HaplotypeHelpButton title="About simple-locus repeat counts">
              <p style={{ marginTop: 0 }}>
                These plots appear only when the source data provide one unambiguous repeat unit and
                an admitted exact repeat count for this locus. Compound loci and loci without an
                exact component measurement use whole-record ALT − REF length instead.
              </p>
              <p>
                The allele plot groups called chromosome copies by repeat count. The genotype plot
                groups people by their shorter and longer called allele repeat counts; darker
                squares represent more people.
              </p>
              <p style={{ marginBottom: 0 }}>
                Population and sex controls filter called observations. These admitted histograms do
                not provide a no-call denominator and are not a clinical interpretation.
              </p>
            </HaplotypeHelpButton>
          </div>
          <SimpleLocusPlotGrid data-testid="lr-tr-repeat-count-grid">
            <SimpleLocusPlotCard>
              <LongReadAlleleSizeDistributionSection
                variantId={locus.id}
                alleleSizeDistribution={locus.repeat_count_plots.allele_size_distribution}
                maxRepunits={locus.repeat_count_plots.max_repunits || 0}
                repeatUnit={locus.repeat_count_plots.repeat_unit || undefined}
                headingLevel="h3"
                heading="Allele repeat-count distribution"
                compact
                focusObservedDomain
              />
            </SimpleLocusPlotCard>
            <SimpleLocusPlotCard>
              <LongReadGenotypeDistributionSection
                variantId={locus.id}
                genotypeDistribution={locus.repeat_count_plots.genotype_distribution}
                repeatUnit={locus.repeat_count_plots.repeat_unit || undefined}
                headingLevel="h3"
                heading="Genotype repeat-count distribution"
                compact
                focusObservedDomain
              />
            </SimpleLocusPlotCard>
          </SimpleLocusPlotGrid>
        </Panel>
      )}

      <WholeRecordAlleleLandscape
        landscape={locus.whole_record_allele_landscape}
        alleles={locus.alleles.nodes}
        motifs={locus.motifs}
        selectedAllele={selectedAllele}
        navigation={navigation}
        sequencesAvailable={locus.sequences_available}
        sequencesUnavailableReason={locus.sequences_unavailable_reason}
        selectedAlleleDetail={
          locus.selected_allele ? (
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
          ) : undefined
        }
      />

      {!repeatPlotsAvailable && (
        <WholeRecordGenotypeLandscape
          landscape={locus.whole_record_genotype_landscape}
          navigation={navigation}
        />
      )}

      {(locus.alleles.page_info.has_next_page ||
        locus.total_alleles > locus.alleles.nodes.length) && (
        <p role="alert">
          Exact-ALT limit exceeded: the response contains{' '}
          {locus.alleles.nodes.length.toLocaleString()} of {locus.total_alleles.toLocaleString()}{' '}
          alternate alleles. Landscapes are unavailable to avoid truncation.
        </p>
      )}

      {unavailableData.length > 0 && (
        <Panel aria-labelledby="lr-tr-unavailable-heading">
          <h2 id="lr-tr-unavailable-heading">Unavailable data</h2>
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
        <summary>Source provenance</summary>
        <AttributeList>
          <AttributeListItem label="Source TRID">
            <code>{locus.source_trid}</code>
          </AttributeListItem>
          <AttributeListItem label="Source records">
            {locus.source_records.map((record, index) => (
              <React.Fragment key={record.source_variant_id}>
                {index > 0 && ', '}
                <code>{record.source_variant_id}</code> (record {record.record_index};{' '}
                {record.alt_count.toLocaleString()} ALTs)
              </React.Fragment>
            ))}
          </AttributeListItem>
          <AttributeListItem label="Release / run">
            {locus.source_release} / <code>{locus.source_run_id}</code>
          </AttributeListItem>
        </AttributeList>
      </ProvenanceDetails>
    </>
  )
}

export default LongReadTandemRepeatPage
