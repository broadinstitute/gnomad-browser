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

const PrimaryPlots = styled.section`
  margin: 1.5em 0 2.5em;
  padding: 1.25em;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fafafa;
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
    max-width: 260px;
    height: 36px;
    padding: 0 0.6em;
    overflow: hidden;
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

  return (
    <PrimaryPlots aria-label="Exact repeat-count plots" key={plotIdentity}>
      <p>
        Exact <strong>{plots.repeat_unit}</strong> motif-repeat counts for this complete source
        locus. These counts do not describe exact sequences, interruption structures, or clinical
        significance.
      </p>
      {plots.identity && (
        <p>
          <strong>Histogram provenance:</strong> admitted ancillary run{' '}
          <Identity>{plots.identity.ancillary_run_id}</Identity>, joined to exact primary record{' '}
          <Identity>{plots.identity.source_variant_id}</Identity> in run{' '}
          <Identity>{plots.identity.primary_run_id}</Identity>.
        </p>
      )}
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

      <LocusRepeatCountPlots locus={locus} />

      <Section>
        <h2>Locus identity and provenance</h2>
        <p>
          <strong>0-based, half-open locus ID:</strong> <Identity>{locus.id}</Identity>{' '}
          <Button
            onClick={() => navigator.clipboard?.writeText(locus.id)}
            aria-label="Copy full locus ID"
          >
            Copy
          </Button>
        </p>
        <p>
          <strong>Display envelope (one-based, inclusive):</strong> chr{envelope.chrom}:
          {envelope.start1.toLocaleString()}–{envelope.end1.toLocaleString()}. The envelope is a
          convenience, not identity.
        </p>
        <p>
          Source release <strong>{locus.source_release}</strong>; accepted run{' '}
          <Identity>{locus.source_run_id}</Identity>. {locus.source_records.length} source record
          {locus.source_records.length === 1 ? '' : 's'}; {locus.total_alleles.toLocaleString()} ALT
          alleles. Unique carriers:{' '}
          {locus.unique_carrier_count == null
            ? 'Unavailable'
            : locus.unique_carrier_count.toLocaleString()}
          .
        </p>
        {locus.structure && (
          <p>
            <strong>Source motif structure:</strong> {locus.structure}
          </p>
        )}
      </Section>

      <Section>
        <h2>Exact repeat components</h2>
        <TableWrapper>
          <OneLineTable>
            <thead>
              <tr>
                <th>Component</th>
                <th>0-based, half-open</th>
                <th>One-based, inclusive</th>
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
                      {component.chrom}:{component.start0.toLocaleString()}–
                      {component.end0.toLocaleString()}
                    </td>
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

      <Section>
        <h2>Source records</h2>
        {locus.source_records.map((record) => (
          <p key={record.source_variant_id}>
            <strong>Record {record.record_index}:</strong>{' '}
            <Identity>{record.source_variant_id}</Identity> · {record.alt_count} ALTs · AC{' '}
            {record.non_reference_ac.toLocaleString()} · AN {record.an.toLocaleString()} · AF{' '}
            {record.non_reference_af.toPrecision(4)}
          </p>
        ))}
      </Section>

      <Section>
        <h2>ALT alleles</h2>
        <p>
          Locus, source record, and ALT allele are distinct identities. Source motif count is shown
          only from aligned source metadata or an exact one-component sequence derivation.
        </p>
        <TableWrapper>
          <OneLineTable data-testid="lr-tr-allele-table">
            <thead>
              <tr>
                <th>Allele</th>
                <th>Repeat count</th>
                <th>Δ length</th>
                <th>Sequence / motif structure</th>
                <th>AC</th>
                <th>AN</th>
                <th>AF</th>
                <th>Genetic ancestry groups</th>
                <th>Exact allele</th>
              </tr>
            </thead>
            <tbody>
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
