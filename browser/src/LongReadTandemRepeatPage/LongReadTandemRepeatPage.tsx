import React, { useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { trLocusDisplayEnvelope } from '@gnomad/dataset-metadata/longReadTrLocusId'

import AttributeList, { AttributeListItem } from '../AttributeList'
import Link from '../Link'
import { LongReadCohort } from '../LongReadVariantPage/longReadCohort'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'
import {
  ExactAlleleIndex,
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

const Eyebrow = styled.div`
  color: #0f4f81;
  font-size: 12px;
  font-weight: bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const CohortControl = styled.label`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 0.25em;
  font-weight: bold;
`

const SourceAttributes = styled.div`
  margin-top: 1em;
`

const AvailabilityList = styled.dl`
  margin: 0;

  dt,
  dd {
    display: inline;
    line-height: 1.9;
  }

  dt {
    font-weight: bold;
  }

  dd {
    margin-left: 0.5ch;
  }

  dd::after {
    display: block;
    content: '';
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
  const detail = useRef<HTMLElement>(null)
  const invalidHandled = useRef<string | null>(null)

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
    if (!selectedAllele || !locus?.selected_allele || !detail.current) return
    detail.current.focus()
    detail.current.scrollIntoView?.({ block: 'start' })
  }, [locus?.id, locus?.lr_cohort, locus?.selected_allele, selectedAllele])

  const alleleById = useMemo(
    () => new Map((locus?.alleles.nodes || []).map((allele) => [allele.variant_id, allele])),
    [locus?.alleles.nodes]
  )

  if (!locus) return <p role="alert">No exact tandem-repeat locus was found in this cohort.</p>

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
  let selectedDetailAvailability = 'Select an exact ALT'
  if (selectedAllele)
    selectedDetailAvailability = locus.selected_allele ? 'Available' : 'Unavailable'

  return (
    <>
      {selectedAllele && locus.selected_allele_valid === false && (
        <p role="alert">
          The requested exact allele does not belong to this locus or cohort. It has been removed
          from the URL; the locus and other query settings are unchanged.
        </p>
      )}

      <Header>
        <div>
          <Eyebrow>Long-read tandem repeat</Eyebrow>
          <PageHeading>
            Tandem repeat at chr{envelope.chrom}:{envelope.start1.toLocaleString()}–
            {envelope.end1.toLocaleString()}
          </PageHeading>
          <p>GRCh38 · ordered motifs {orderedMotifs.join(' + ') || 'unavailable'}</p>
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
          <AttributeListItem label="Region">
            chr{envelope.chrom}:{envelope.start1.toLocaleString()}–{envelope.end1.toLocaleString()}
          </AttributeListItem>
          <AttributeListItem label="Region size">
            {locus.region.size.toLocaleString()} BP
          </AttributeListItem>
          <AttributeListItem label="Motif vocabulary">
            {vocabulary.join(', ') || 'Unavailable'}
          </AttributeListItem>
          <AttributeListItem label="Ordered source motifs">
            {orderedMotifs.join(' + ') || 'Unavailable'}
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
              ? `${locus.exact_alt_count.toLocaleString()} exact ALT sequences; whole-record Δ length ${deltaRange}`
              : `Unavailable: ${unavailableReason(locus.exact_alt_count_unavailable_reason)}`}
          </AttributeListItem>
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
          <AttributeListItem label="Data release / source run">
            {locus.source_release} / <code>{locus.source_run_id}</code>
          </AttributeListItem>
          {knownLocus && (
            <AttributeListItem label="Separate short-read context">
              <Link to={`/short-tandem-repeat/${knownLocus.id}?dataset=gnomad_r4`}>
                View {knownLocus.gene_symbol || knownLocus.id} short-read tandem-repeat details
              </Link>
            </AttributeListItem>
          )}
        </AttributeList>
      </SourceAttributes>

      <LongReadTrComponentTrack locus={locus} />

      <Panel aria-labelledby="lr-tr-measurement-heading">
        <h2 id="lr-tr-measurement-heading">Measurement availability</h2>
        <p>
          <strong>Whole-record ALT − REF length (bp):</strong>{' '}
          {locus.whole_record_allele_landscape.status === 'AVAILABLE'
            ? 'Available'
            : `Unavailable — ${unavailableReason(locus.whole_record_allele_landscape.reason_code)}`}
        </p>
        <p>
          <strong>Source component copy counts:</strong>{' '}
          {locus.component_measurement_available
            ? 'Eligible only through the strict admitted one-component repeat-count data below.'
            : `Unavailable — ${
                locus.component_measurement_unavailable_reason ||
                'whole-record sequence cannot be assigned to source components'
              }.`}
        </p>
      </Panel>

      <WholeRecordAlleleLandscape
        landscape={locus.whole_record_allele_landscape}
        alleles={locus.alleles.nodes}
        selectedAllele={selectedAllele}
        navigation={navigation}
      />

      {repeatPlotsAvailable && (
        <Panel aria-labelledby="lr-tr-simple-measurement-heading">
          <h2 id="lr-tr-simple-measurement-heading">Admitted simple-locus repeat counts</h2>
          <p>
            These plots are available only because every plotted allele/genotype passed the strict
            one-component exact-mapping checks. Their units are motif repeats, not whole-record bp.
          </p>
          <LongReadAlleleSizeDistributionSection
            variantId={locus.id}
            alleleSizeDistribution={locus.repeat_count_plots.allele_size_distribution}
            maxRepunits={locus.repeat_count_plots.max_repunits || 0}
            repeatUnit={locus.repeat_count_plots.repeat_unit || undefined}
            heading="Allele repeat-count distribution"
          />
          <LongReadGenotypeDistributionSection
            variantId={locus.id}
            genotypeDistribution={locus.repeat_count_plots.genotype_distribution}
            repeatUnit={locus.repeat_count_plots.repeat_unit || undefined}
            heading="Genotype repeat-count distribution"
          />
        </Panel>
      )}

      <WholeRecordGenotypeLandscape
        landscape={locus.whole_record_genotype_landscape}
        navigation={navigation}
      />

      <ExactAlleleIndex
        alleles={locus.alleles.nodes}
        selectedAllele={selectedAllele}
        navigation={navigation}
      />

      {locus.selected_allele && (
        <SelectedExactAlleleDetail
          ref={detail}
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
      )}

      {(locus.alleles.page_info.has_next_page ||
        locus.total_alleles > locus.alleles.nodes.length) && (
        <p role="alert">
          This locus exceeds the safe exact-ALT limit. Scientific landscapes are unavailable rather
          than silently truncated. The response contains{' '}
          {locus.alleles.nodes.length.toLocaleString()} of {locus.total_alleles.toLocaleString()}{' '}
          alternate alleles.
        </p>
      )}

      <Panel aria-labelledby="lr-tr-availability-heading">
        <h2 id="lr-tr-availability-heading">Data availability</h2>
        <AvailabilityList>
          <div>
            <dt>Exact ALT index</dt>
            <dd>
              {locus.exact_alt_count_complete
                ? `Available (${locus.exact_alt_count.toLocaleString()})`
                : `Unavailable — ${unavailableReason(locus.exact_alt_count_unavailable_reason)}`}
            </dd>
          </div>
          <div>
            <dt>Exact ALT sequences</dt>
            <dd>
              {locus.sequences_available
                ? 'Available on exact selection'
                : `Unavailable — ${unavailableReason(locus.sequences_unavailable_reason)}`}
            </dd>
          </div>
          <div>
            <dt>Selected exact sequence/detail</dt>
            <dd>{selectedDetailAvailability}</dd>
          </div>
          <div>
            <dt>Whole-record allele landscape</dt>
            <dd>
              {locus.whole_record_allele_landscape.status === 'AVAILABLE'
                ? 'Available'
                : `Unavailable — ${unavailableReason(
                    locus.whole_record_allele_landscape.reason_code
                  )}`}
            </dd>
          </div>
          <div>
            <dt>Source allele purity</dt>
            <dd>
              {locus.whole_record_allele_landscape.purity_available
                ? 'Available where source AP_allele aligns'
                : `Unavailable — ${unavailableReason(
                    locus.whole_record_allele_landscape.purity_unavailable_reason
                  )}`}
            </dd>
          </div>
          <div>
            <dt>Whole-record genotype landscape</dt>
            <dd>
              {locus.whole_record_genotype_landscape.status === 'AVAILABLE'
                ? 'Available'
                : `Unavailable — ${unavailableReason(
                    locus.whole_record_genotype_landscape.reason_code
                  )}`}
            </dd>
          </div>
          <div>
            <dt>Component/repeat-count plots</dt>
            <dd>
              {repeatPlotsAvailable
                ? 'Available for this admitted simple locus'
                : `Unavailable — ${
                    locus.component_measurement_unavailable_reason ||
                    unavailableReason(locus.repeat_count_plots.reason_code)
                  }`}
            </dd>
          </div>
        </AvailabilityList>
      </Panel>
    </>
  )
}

export default LongReadTandemRepeatPage
