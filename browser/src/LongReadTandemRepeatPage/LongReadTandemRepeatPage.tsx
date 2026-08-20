import React, { useEffect, useRef } from 'react'
import styled from 'styled-components'
import { PageHeading, Select } from '@gnomad/ui'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import {
  TrLocusComponent,
  trLocusDisplayEnvelope,
} from '@gnomad/dataset-metadata/longReadTrLocusId'

import Link from '../Link'
import { LongReadCohort, longReadVariantUrl } from '../LongReadVariantPage/longReadCohort'

const Header = styled.header`
  margin-bottom: 1em;

  h1 {
    margin-bottom: 0.25em;
  }
`

const HeaderSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5em;

  label {
    margin-left: 0.5em;
  }
`

const AlleleTableViewport = styled.div`
  overflow: auto;
  height: 80vh;
  border: 1px solid #ddd;
  border-radius: 3px;
`

const OneLineTable = styled.table`
  width: 100%;
  min-width: 650px;
  border-collapse: collapse;
  table-layout: fixed;

  th,
  td {
    overflow: hidden;
    height: 36px;
    padding: 0 0.6em;
    border-bottom: 1px solid #ddd;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  thead th {
    position: sticky;
    z-index: 1;
    top: 0;
    background: #fff;
  }

  tbody tr:hover {
    background: #f0f7ff;
  }

  th:first-child,
  td:first-child {
    width: 16%;
  }

  th:last-child,
  td:last-child {
    width: 18%;
  }

  tr[aria-selected='true'] {
    background: #fff3cd;
    outline: 2px solid #428bca;
    outline-offset: -2px;
  }
`

const KnownLocusLink = styled.p`
  margin: 1.25em 0;
`

type Frequency = { ac: number; an: number; af: number }
type Allele = {
  variant_id: string
  alt_index: number
  length: number | null
  repeat_count: number | null
  repeat_count_source: string | null
  freq: { all: Frequency }
}

type Locus = {
  id: string
  motifs: string[]
  lr_cohort: LongReadCohort
  source_release: string
  source_run_id: string
  total_alleles: number
  selected_allele_valid: boolean | null
  components: TrLocusComponent[]
  source_records: { source_variant_id: string }[]
  short_read_matches: { id: string; gene_symbol: string | null }[]
  alleles: {
    nodes: Allele[]
    page_info: { has_next_page: boolean }
  }
}

const LongReadTandemRepeatPage = ({
  datasetId: _datasetId,
  locus,
  selectedAllele,
  onCohortChange,
}: {
  datasetId: DatasetId
  locus: Locus | null
  selectedAllele?: string
  onCohortChange: (cohort: LongReadCohort) => void
}) => {
  const selectedRow = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    const row = selectedRow.current
    if (!row) return
    row.focus()
    row.scrollIntoView?.({ block: 'center' })
  }, [locus?.id, locus?.lr_cohort, selectedAllele])

  if (!locus) return <p role="alert">No exact tandem-repeat locus was found in this cohort.</p>

  const envelope = trLocusDisplayEnvelope({
    components: locus.components,
    canonicalId: locus.id,
    sourceTrid: locus.id,
  })
  const motifSummary = locus.motifs.join(' + ') || 'Motif unavailable'
  const knownLocus = locus.short_read_matches[0]

  return (
    <>
      {selectedAllele && locus.selected_allele_valid === false && (
        <p role="alert">
          The requested exact allele does not belong to this locus. Showing the allele index.
        </p>
      )}

      <Header>
        <PageHeading>
          Tandem repeat at chr{envelope.chrom}:{envelope.start1.toLocaleString()}–
          {envelope.end1.toLocaleString()}
        </PageHeading>
        <HeaderSummary aria-label="Locus summary">
          <strong>{motifSummary}</strong>
          <span aria-hidden="true">·</span>
          <span>{locus.total_alleles.toLocaleString()} alternate alleles</span>
          <span aria-hidden="true">·</span>
          <label htmlFor="lr-tr-cohort">Cohort</label>
          <Select
            id="lr-tr-cohort"
            aria-label="Cohort"
            value={locus.lr_cohort}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              onCohortChange(event.target.value as LongReadCohort)
            }
          >
            <option value="hgsvc_hprc">HGSVC / HPRC</option>
            <option value="aou">All of Us</option>
          </Select>
        </HeaderSummary>
      </Header>

      <AlleleTableViewport
        data-testid="lr-tr-allele-table-viewport"
        role="region"
        aria-label="Scrollable alternate allele index"
        tabIndex={0}
      >
        <OneLineTable data-testid="lr-tr-allele-table" aria-label="Alternate allele index">
          <thead>
            <tr>
              <th>Allele</th>
              <th>Repeat count</th>
              <th>Δ length</th>
              <th>AC</th>
              <th>AN</th>
              <th>AF</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {locus.alleles.nodes.map((allele) => {
              const selected = allele.variant_id === selectedAllele
              return (
                <tr
                  key={allele.variant_id}
                  aria-selected={selected}
                  ref={selected ? selectedRow : undefined}
                  tabIndex={selected ? -1 : undefined}
                  title={allele.variant_id}
                >
                  <th scope="row">ALT {allele.alt_index}</th>
                  <td title={allele.repeat_count_source || 'Repeat count unavailable'}>
                    {allele.repeat_count == null ? '—' : allele.repeat_count.toLocaleString()}
                  </td>
                  <td>
                    {allele.length == null
                      ? '—'
                      : `${allele.length >= 0 ? '+' : ''}${allele.length.toLocaleString()} bp`}
                  </td>
                  <td>{allele.freq.all.ac.toLocaleString()}</td>
                  <td>{allele.freq.all.an.toLocaleString()}</td>
                  <td>{allele.freq.all.af.toPrecision(4)}</td>
                  <td>
                    <Link
                      to={longReadVariantUrl(allele.variant_id, locus.lr_cohort)}
                      preserveSelectedDataset={false}
                    >
                      View allele
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </OneLineTable>
      </AlleleTableViewport>

      {(locus.alleles.page_info.has_next_page ||
        locus.total_alleles > locus.alleles.nodes.length) && (
        <p role="alert">
          This locus exceeds the safe table limit. Showing a bounded set of{' '}
          {locus.alleles.nodes.length.toLocaleString()} alternate alleles.
        </p>
      )}

      {knownLocus && (
        <KnownLocusLink>
          <Link to={`/short-tandem-repeat/${knownLocus.id}?dataset=gnomad_r4`}>
            View {knownLocus.gene_symbol || knownLocus.id} tandem-repeat details
          </Link>
        </KnownLocusLink>
      )}
    </>
  )
}

export default LongReadTandemRepeatPage
