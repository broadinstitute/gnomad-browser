import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Button, Modal, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import {
  TrLocusComponent,
  trComponentDisplayRegion,
  trLocusDisplayEnvelope,
} from '@gnomad/dataset-metadata/longReadTrLocusId'

import Link from '../Link'
import TableWrapper from '../TableWrapper'
import type { AlleleSizeDistributionCohort } from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import {
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
  type GenotypeDistributionCohort,
} from '../LongReadVariantPage/LongReadSTRDistributionSections'
import { LongReadCohort, longReadVariantUrl } from '../LongReadVariantPage/longReadCohort'

const Section = styled.section`
  margin: 2em 0;
`

const Identity = styled.code`
  overflow-wrap: anywhere;
`

const SummaryCard = styled.section`
  padding: 1em 1.25em;
  border-left: 5px solid #428bca;
  margin: 1.5em 0;
  border-radius: 4px;
  background: #f3f8fc;

  h2 {
    margin-top: 0;
  }

  p:last-child {
    margin-bottom: 0;
  }
`

const PrimaryPlots = styled.section`
  padding: 1.25em;
  border: 1px solid #ddd;
  margin: 1.5em 0 2.5em;
  border-radius: 4px;
  background: #fafafa;
`

const ReferenceRow = styled.tr`
  background: #eef5e8;
  font-weight: 600;
`

const TechnicalDetails = styled.details`
  padding: 1em 1.25em;
  border: 1px solid #ddd;
  margin: 2em 0;
  border-radius: 4px;

  > summary {
    cursor: pointer;
    font-size: 1.15em;
    font-weight: 700;
  }
`

const PlotGrid = styled.div`
  display: grid;
  /* stylelint-disable unit-whitelist */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 430px), 1fr));
  /* stylelint-enable unit-whitelist */
  gap: 2em;

  > div {
    min-width: 0;
  }
`

const OneLineTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    overflow: hidden;
    max-width: 260px;
    height: 36px;
    padding: 0 0.6em;
    border-bottom: 1px solid #ddd;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr[aria-selected='true'] {
    background: #fff3cd;
    outline: 2px solid #428bca;
    outline-offset: -2px;
  }
`

const CompactSequence = ({ sequence }: { sequence: string }) => {
  const display =
    sequence.length > 34 ? `${sequence.slice(0, 16)}…${sequence.slice(-12)}` : sequence
  return <span title={sequence}>{display}</span>
}

type Frequency = { id: string; ac: number; an: number; af: number }
type Allele = {
  variant_id: string
  source_variant_id: string
  alt_index: number
  alt_count: number
  ref: string
  alt: string
  length: number | null
  repeat_count: number | null
  repeat_count_source: string | null
  motif_purity: number | null
  freq: { all: Frequency; populations: Frequency[] }
}

type RepeatCountPlots = {
  status:
    | 'AVAILABLE_EXACT'
    | 'UNAVAILABLE_ANCILLARY'
    | 'UNAVAILABLE_COMPOUND_LOCUS'
    | 'UNAVAILABLE_MULTIPLE_SOURCE_RECORDS'
    | 'UNAVAILABLE_NO_EXACT_MAPPING'
    | 'UNAVAILABLE_INVALID_HISTOGRAM'
    | 'UNAVAILABLE_PAYLOAD_TOO_LARGE'
  reason_code: string | null
  identity: {
    ancillary_run_id: string
    primary_database: string
    primary_run_id: string
    primary_task_id: string
    primary_attempt_id: string
    source_variant_id: string
    component: TrLocusComponent
  } | null
  unit: string | null
  repeat_unit: string | null
  overall: {
    called_alleles: number
    called_diploid_genotypes: number | null
    no_call_rate: number | null
    no_call_rate_status: string
  } | null
  allele_size_distribution: AlleleSizeDistributionCohort[]
  genotype_distribution: GenotypeDistributionCohort[]
  max_repunits: number | null
}

type Locus = {
  id: string
  source_trid: string
  chrom: string
  motifs: string[]
  structure: string | null
  lr_cohort: LongReadCohort
  source_release: string
  source_run_id: string
  total_alleles: number
  unique_carrier_count: number | null
  selected_allele_valid: boolean | null
  components: TrLocusComponent[]
  source_records: {
    record_index: number
    source_variant_id: string
    alt_count: number
    ref: string
    non_reference_ac: number
    an: number
    non_reference_af: number
    source: string | null
    region: string | null
  }[]
  repeat_count_plots: RepeatCountPlots
  short_read_matches: {
    id: string
    gene_symbol: string | null
    reference_repeat_unit: string
    stripy_id: string | null
    strchive_id: string | null
  }[]
  alleles: {
    nodes: Allele[]
    page_info: { has_next_page: boolean; end_cursor: string | null }
  }
}

export const referenceRepeatCount = (locus: Pick<Locus, 'components'>) => {
  if (locus.components.length !== 1) return null
  const component = locus.components[0]
  const span = component.end0 - component.start0
  if (!component.motif || span <= 0 || span % component.motif.length !== 0) return null
  return span / component.motif.length
}

export const referenceCopySummary = (
  locus: Pick<Locus, 'source_records' | 'repeat_count_plots'>
) => {
  if (locus.source_records.length !== 1) return null
  const record = locus.source_records[0]
  if (
    !Number.isInteger(record.an) ||
    !Number.isInteger(record.non_reference_ac) ||
    record.an < 0 ||
    record.non_reference_ac < 0 ||
    record.non_reference_ac > record.an
  ) {
    return null
  }
  if (
    locus.repeat_count_plots.status === 'AVAILABLE_EXACT' &&
    (locus.repeat_count_plots.identity?.source_variant_id !== record.source_variant_id ||
      locus.repeat_count_plots.overall?.called_alleles !== record.an)
  ) {
    return null
  }
  return {
    calledCopies: record.an,
    nonReferenceCopies: record.non_reference_ac,
    referenceCopies: record.an - record.non_reference_ac,
  }
}

const ucscUrl = (component: TrLocusComponent) => {
  const region = trComponentDisplayRegion(component)
  return `https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=chr${region.chrom}%3A${region.start1}-${region.end1}`
}

const unavailablePlotMessage = (plots: RepeatCountPlots) => {
  if (plots.status === 'UNAVAILABLE_COMPOUND_LOCUS') {
    return 'Repeat-count plots unavailable: this source locus has multiple repeat components and no admitted single whole-locus repeat-count definition.'
  }
  if (plots.status === 'UNAVAILABLE_MULTIPLE_SOURCE_RECORDS') {
    return 'Repeat-count plots unavailable: this locus resolves to multiple primary source records, so no single exact histogram can be assigned.'
  }
  if (plots.status === 'UNAVAILABLE_ANCILLARY') {
    return 'Repeat-count plots unavailable: no admitted histogram source is configured for this cohort.'
  }
  if (plots.status === 'UNAVAILABLE_PAYLOAD_TOO_LARGE') {
    return 'Repeat-count plots unavailable: the exact admitted histogram exceeds the bounded response size.'
  }
  if (plots.status === 'UNAVAILABLE_INVALID_HISTOGRAM') {
    return 'Repeat-count plots unavailable: the exact admitted histogram did not pass integrity validation.'
  }
  return 'Repeat-count plots unavailable: no exact admitted histogram matches this complete source locus identity.'
}

const LocusRepeatCountPlots = ({ locus }: { locus: Locus }) => {
  const plots = locus.repeat_count_plots
  if (plots.status !== 'AVAILABLE_EXACT') {
    return (
      <PrimaryPlots aria-label="Repeat-count plot availability">
        <h2>Repeat-count plots</h2>
        <p role="status">{unavailablePlotMessage(plots)}</p>
      </PrimaryPlots>
    )
  }

  const hasAlleles = plots.allele_size_distribution.length > 0 && plots.max_repunits != null
  const hasGenotypes = plots.genotype_distribution.length > 0
  const calledCountDistributions = {
    alleleSizeDistribution: plots.allele_size_distribution,
    genotypeDistribution: plots.genotype_distribution,
  }
  const plotIdentity = `${locus.lr_cohort}-${locus.id}-${
    plots.identity?.ancillary_run_id || 'exact'
  }`
  const repeats = referenceRepeatCount(locus)
  const copies = referenceCopySummary(locus)

  return (
    <PrimaryPlots aria-label="Exact repeat-count plots" key={plotIdentity}>
      <p>
        These distributions include <strong>all called chromosome copies</strong>: the reference
        allele and observed alternate alleles. Each bar is a count of{' '}
        <strong>{plots.repeat_unit}</strong> motif repeats, not a count of exact sequences.
        {repeats != null && copies && (
          <>
            {' '}
            The reference allele has {repeats.toLocaleString()} repeats and contributes{' '}
            {copies.referenceCopies.toLocaleString()} copies to that bar.
          </>
        )}
      </p>
      <p>
        Alternate sequences can have the same repeat count, and repeat counts do not show sequence
        interruptions or clinical significance.
      </p>
      <PlotGrid>
        {hasAlleles && (
          <div>
            <LongReadAlleleSizeDistributionSection
              variantId={`${plotIdentity}-alleles`}
              alleleSizeDistribution={plots.allele_size_distribution}
              maxRepunits={plots.max_repunits!}
              repeatUnit={plots.repeat_unit || undefined}
              heading="Allele repeat-count distribution"
              calledCountDistributions={calledCountDistributions}
              focusObservedDomain
            />
          </div>
        )}
        {hasGenotypes && (
          <div>
            <LongReadGenotypeDistributionSection
              variantId={`${plotIdentity}-genotypes`}
              genotypeDistribution={plots.genotype_distribution}
              repeatUnit={plots.repeat_unit || undefined}
              heading="Diploid genotype distribution"
              calledCountDistributions={calledCountDistributions}
              focusObservedDomain
              explainGenotypes
            />
          </div>
        )}
      </PlotGrid>
      {!hasGenotypes && (
        <p>Diploid genotype distribution unavailable for this admitted histogram.</p>
      )}
    </PrimaryPlots>
  )
}

const LongReadTandemRepeatPage = ({
  datasetId: _datasetId,
  locus,
  selectedAllele,
  onCohortChange,
  onNextPage,
}: {
  datasetId: DatasetId
  locus: Locus | null
  selectedAllele?: string
  onCohortChange: (cohort: LongReadCohort) => void
  onNextPage: (cursor: string) => void
}) => {
  const [detail, setDetail] = useState<Allele | null>(null)
  const selectedRow = useRef<HTMLTableRowElement>(null)
  useEffect(() => selectedRow.current?.focus(), [locus?.id, locus?.lr_cohort, selectedAllele])

  if (!locus) return <p role="alert">No exact tandem-repeat locus was found in this cohort.</p>
  const envelope = trLocusDisplayEnvelope({
    components: locus.components,
    canonicalId: locus.id,
    sourceTrid: locus.source_trid,
  })
  const referenceRepeats = referenceRepeatCount(locus)
  const copySummary = referenceCopySummary(locus)
  const calledIndividuals =
    locus.repeat_count_plots.status === 'AVAILABLE_EXACT'
      ? locus.repeat_count_plots.overall?.called_diploid_genotypes ?? null
      : null
  const motifLabel = locus.motifs.join(', ') || 'unavailable motif'

  return (
    <>
      {selectedAllele && locus.selected_allele_valid === false && (
        <p role="alert">
          The requested exact allele does not belong to this locus. Showing the first allele page.
        </p>
      )}

      <p>
        <label htmlFor="lr-tr-cohort">Cohort: </label>
        <Select
          id="lr-tr-cohort"
          value={locus.lr_cohort}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onCohortChange(event.target.value as LongReadCohort)
          }
        >
          <option value="hgsvc_hprc">HGSVC / HPRC</option>
          <option value="aou">All of Us</option>
        </Select>
      </p>

      <SummaryCard aria-labelledby="lr-tr-summary-heading">
        <h2 id="lr-tr-summary-heading">What this page shows</h2>
        <p>
          This <strong>{motifLabel}-repeat locus</strong> spans chr{envelope.chrom}:
          {envelope.start1.toLocaleString()}–{envelope.end1.toLocaleString()} (one-based,
          inclusive). The reference genome has{' '}
          <strong>
            {referenceRepeats == null
              ? 'an unavailable repeat count'
              : `${referenceRepeats.toLocaleString()} ${motifLabel} repeats`}
          </strong>
          .
        </p>
        <p>
          {copySummary ? (
            <>
              <strong>{copySummary.calledCopies.toLocaleString()} called chromosome copies</strong>
              {calledIndividuals == null ? (
                '; the number of individuals with two called alleles is unavailable'
              ) : (
                <>
                  {' '}
                  from{' '}
                  <strong>
                    {calledIndividuals.toLocaleString()} individuals with complete diploid genotypes
                  </strong>{' '}
                  (two called alleles each)
                </>
              )}
              : {copySummary.referenceCopies.toLocaleString()} reference and{' '}
              {copySummary.nonReferenceCopies.toLocaleString()} non-reference copies across{' '}
              {locus.total_alleles.toLocaleString()} observed non-reference allele
              {locus.total_alleles === 1 ? ' type' : ' types'}.
            </>
          ) : (
            <>
              Called chromosome-copy counts, the reference/non-reference split, and complete diploid
              genotype count are <strong>unavailable</strong> because the exact source cardinality
              and called-copy totals do not support one reconciled value. The locus has{' '}
              {locus.total_alleles.toLocaleString()} observed non-reference allele{' '}
              {locus.total_alleles === 1 ? 'type' : 'types'}.
            </>
          )}
        </p>
        <p>
          {locus.unique_carrier_count == null ? (
            <>
              The number of unique carriers is <strong>unavailable</strong>.
            </>
          ) : (
            <>
              <strong>{locus.unique_carrier_count.toLocaleString()} unique carriers</strong> means
              that many individuals have at least one non-reference allele. Carrier count is a count
              of people; non-reference chromosome-copy count (source AC) counts alleles, so one
              carrier can contribute two copies.
            </>
          )}
        </p>
      </SummaryCard>

      <LocusRepeatCountPlots locus={locus} />

      <Section>
        <h2>Repeat {locus.components.length === 1 ? 'region' : 'regions'}</h2>
        <TableWrapper>
          <OneLineTable>
            <thead>
              <tr>
                <th>Component</th>
                <th>Genomic span (one-based, inclusive)</th>
                <th>Motif</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {locus.components.map((component, index) => {
                const display = trComponentDisplayRegion(component)
                const componentIdentity = `${component.chrom}-${component.start0}-${component.end0}-${component.motif}`
                const occurrence = locus.components
                  .slice(0, index + 1)
                  .filter(
                    (candidate) =>
                      `${candidate.chrom}-${candidate.start0}-${candidate.end0}-${candidate.motif}` ===
                      componentIdentity
                  ).length
                return (
                  <tr key={`${componentIdentity}-occurrence-${occurrence}`}>
                    <td>{index + 1}</td>
                    <td>
                      chr{display.chrom}:{display.start1.toLocaleString()}–
                      {display.end1.toLocaleString()}
                    </td>
                    <td>{component.motif}</td>
                    <td>
                      <a href={ucscUrl(component)} target="_blank" rel="noopener noreferrer">
                        UCSC
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </OneLineTable>
        </TableWrapper>
      </Section>

      {locus.short_read_matches.length > 0 && (
        <Section>
          <h2>Known-locus context</h2>
          <p>
            Exact component match only. This context does not classify compound long-read ALT
            alleles as pathogenic.
          </p>
          {locus.short_read_matches.map((match) => (
            <p key={match.id}>
              <Link to={`/short-tandem-repeat/${match.id}?dataset=gnomad_r4`}>
                {match.gene_symbol || match.id} short-read tandem-repeat page
              </Link>{' '}
              (reference unit {match.reference_repeat_unit})
              {match.strchive_id && (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={`https://strchive.org/loci/${match.strchive_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    STRchive
                  </a>
                </>
              )}
              {match.stripy_id && (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={`https://stripy.org/database/${match.stripy_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    STRipy
                  </a>
                </>
              )}
              {match.gene_symbol && (
                <>
                  {' '}
                  ·{' '}
                  <a
                    href={`https://trexplorer.broadinstitute.org/#sc=isPathogenic&sd=DESC&showRs=1&searchQuery=${match.gene_symbol}&showColumns=0i1i2i3i4i7i21i17`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Search TRExplorer for {match.gene_symbol}
                  </a>
                </>
              )}
            </p>
          ))}
        </Section>
      )}

      <TechnicalDetails>
        <summary>Technical details and provenance</summary>
        <p>
          These identifiers and coordinate conventions support exact reproduction but are not needed
          to interpret the biological counts above.
        </p>
        <p>
          <strong>Canonical route ID (0-based, half-open):</strong> <Identity>{locus.id}</Identity>{' '}
          <Button
            onClick={() => navigator.clipboard?.writeText(locus.id)}
            aria-label="Copy full locus ID"
          >
            Copy
          </Button>
        </p>
        <p>
          <strong>Source:</strong> release {locus.source_release}; accepted run{' '}
          <Identity>{locus.source_run_id}</Identity>{' '}
          <Button
            onClick={() => navigator.clipboard?.writeText(locus.source_run_id)}
            aria-label="Copy source run ID"
          >
            Copy run ID
          </Button>
        </p>
        {locus.structure && (
          <p>
            <strong>Raw source STRUC:</strong> <Identity>{locus.structure}</Identity>
          </p>
        )}
        <p>
          <strong>Repeat components (0-based, half-open):</strong>{' '}
          {locus.components.map((component) => (
            <Identity
              key={`${component.chrom}-${component.start0}-${component.end0}-${component.motif}`}
            >
              {component.chrom}:{component.start0}–{component.end0} ({component.motif}){' '}
            </Identity>
          ))}
        </p>
        {locus.repeat_count_plots.identity && (
          <p>
            <strong>Histogram join:</strong> ancillary run{' '}
            <Identity>{locus.repeat_count_plots.identity.ancillary_run_id}</Identity>; primary
            database <Identity>{locus.repeat_count_plots.identity.primary_database}</Identity>, run{' '}
            <Identity>{locus.repeat_count_plots.identity.primary_run_id}</Identity>, task{' '}
            <Identity>{locus.repeat_count_plots.identity.primary_task_id}</Identity>, attempt{' '}
            <Identity>{locus.repeat_count_plots.identity.primary_attempt_id}</Identity>.
          </p>
        )}
        {locus.source_records.map((record) => (
          <p key={record.source_variant_id}>
            <strong>Source record {record.record_index}:</strong>{' '}
            <Identity>{record.source_variant_id}</Identity>{' '}
            <Button
              onClick={() => navigator.clipboard?.writeText(record.source_variant_id)}
              aria-label={`Copy source record ${record.record_index} ID`}
            >
              Copy ID
            </Button>{' '}
            · {record.alt_count} source ALTs · non-reference AC{' '}
            {record.non_reference_ac.toLocaleString()} · AN {record.an.toLocaleString()} · AF{' '}
            {record.non_reference_af.toPrecision(4)} · source REF (including the shared anchor){' '}
            <Identity>{record.ref}</Identity>
          </p>
        ))}
      </TechnicalDetails>

      <Section>
        <h2>Observed alleles</h2>
        <p>
          The reference row reconciles the reference-repeat bar with the alternate rows. Source REF
          and ALT strings may begin with a shared anchor base required by variant notation; repeat
          counts exclude that anchor. Alternate repeat counts are shown only when exact aligned
          metadata or a one-component sequence derivation supports them.
        </p>
        {!copySummary && (
          <p role="status">
            Reference copy count unavailable: this locus does not have one reconciled source record
            and called-copy total.
          </p>
        )}
        <TableWrapper>
          <OneLineTable data-testid="lr-tr-allele-table">
            <thead>
              <tr>
                <th>Allele</th>
                <th>Repeat count</th>
                <th>Δ vs reference</th>
                <th>Sequence / motif structure</th>
                <th>Chromosome copies</th>
                <th>Called copies</th>
                <th>Frequency</th>
                <th>Genetic ancestry groups</th>
                <th>Exact allele</th>
              </tr>
            </thead>
            <tbody>
              {copySummary && (
                <ReferenceRow data-testid="lr-tr-reference-row">
                  <th scope="row">Reference</th>
                  <td>{referenceRepeats == null ? '—' : referenceRepeats.toLocaleString()}</td>
                  <td>0 bp</td>
                  <td title={locus.source_records[0].ref}>Reference {motifLabel} repeat</td>
                  <td>{copySummary.referenceCopies.toLocaleString()}</td>
                  <td>{copySummary.calledCopies.toLocaleString()}</td>
                  <td>
                    {copySummary.calledCopies === 0
                      ? '—'
                      : (copySummary.referenceCopies / copySummary.calledCopies).toPrecision(4)}
                  </td>
                  <td>—</td>
                  <td>Reference genome</td>
                </ReferenceRow>
              )}
              {locus.alleles.nodes.map((allele) => {
                const selected = allele.variant_id === selectedAllele
                const ancestry = allele.freq.populations
                  .slice(0, 4)
                  .map(
                    (frequency) => `${frequency.id.toUpperCase()} ${frequency.af.toPrecision(3)}`
                  )
                  .join(' · ')
                return (
                  <tr
                    key={allele.variant_id}
                    aria-selected={selected}
                    ref={selected ? selectedRow : undefined}
                    tabIndex={selected ? -1 : undefined}
                  >
                    <td title={allele.variant_id}>
                      <Link
                        to={`/tandem-repeat/${locus.id}?dataset=gnomad_r4_lr&lr_cohort=${
                          locus.lr_cohort
                        }&allele=${encodeURIComponent(allele.variant_id)}`}
                        preserveSelectedDataset={false}
                      >
                        {locus.source_records.length > 1
                          ? `Record ${
                              locus.source_records.find(
                                (record) => record.source_variant_id === allele.source_variant_id
                              )?.record_index
                            } · ALT ${allele.alt_index}`
                          : `ALT ${allele.alt_index}`}
                      </Link>
                    </td>
                    <td title={allele.repeat_count_source || 'Unavailable'}>
                      {allele.repeat_count == null ? '—' : allele.repeat_count.toLocaleString()}
                    </td>
                    <td>
                      {allele.length == null
                        ? '—'
                        : `${allele.length >= 0 ? '+' : ''}${allele.length} bp`}
                    </td>
                    <td>
                      <Button
                        onClick={() => setDetail(allele)}
                        aria-label={`Details for ALT ${allele.alt_index}`}
                      >
                        <CompactSequence sequence={allele.alt} /> · {locus.motifs.join(', ') || '—'}
                      </Button>
                    </td>
                    <td>{allele.freq.all.ac.toLocaleString()}</td>
                    <td>{allele.freq.all.an.toLocaleString()}</td>
                    <td>{allele.freq.all.af.toPrecision(4)}</td>
                    <td
                      title={allele.freq.populations
                        .map((f) => `${f.id}: AC ${f.ac}, AN ${f.an}, AF ${f.af}`)
                        .join('\n')}
                    >
                      {ancestry || '—'}
                    </td>
                    <td>
                      <Link
                        to={longReadVariantUrl(allele.variant_id, locus.lr_cohort)}
                        preserveSelectedDataset={false}
                      >
                        Open exact
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </OneLineTable>
        </TableWrapper>
        {locus.alleles.page_info.has_next_page && locus.alleles.page_info.end_cursor && (
          <p>
            <Button onClick={() => onNextPage(locus.alleles.page_info.end_cursor!)}>
              Next 50 alleles
            </Button>
          </p>
        )}
      </Section>

      {detail && (
        <Modal
          title={`ALT ${detail.alt_index} details`}
          size="large"
          onRequestClose={() => setDetail(null)}
        >
          <p>
            Exact immutable allele: <Identity>{detail.variant_id}</Identity>
          </p>
          <p>
            <strong>REF:</strong> <Identity>{detail.ref}</Identity>
          </p>
          <p>
            <strong>ALT:</strong> <Identity>{detail.alt}</Identity>
          </p>
          <p>
            The source REF and ALT strings include their shared leading anchor base when required by
            variant notation. The repeat count excludes that anchor.
          </p>
          <p>
            Motifs: {locus.motifs.join(', ') || 'Unavailable'}; source purity:{' '}
            {detail.motif_purity == null ? 'Unavailable' : detail.motif_purity}.
          </p>
          <p>Sequence decomposition is descriptive and is not a clinical classification.</p>
          <Link
            to={longReadVariantUrl(detail.variant_id, locus.lr_cohort)}
            preserveSelectedDataset={false}
          >
            Open legacy exact allele page
          </Link>
        </Modal>
      )}
    </>
  )
}

export default LongReadTandemRepeatPage
