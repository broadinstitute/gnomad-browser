import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import { trLocusUrl } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { BaseTable, Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import Link from '../Link'
import Query from '../Query'
import StatusMessage from '../StatusMessage'
import {
  PAGE_SIZE,
  availableChromosomes,
  defaultReferenceFilters,
  filterAndSortReferenceRows,
  isExact,
  isMultiple,
} from './referencePageHelpers'
import { LongReadTrReferenceCohortResult, LongReadTrReferenceRow, ReferenceFilters } from './types'

const Intro = styled.p`
  max-width: 920px;
  line-height: 1.5;
`

const Boundary = styled.p`
  max-width: 920px;
  padding: 0.8em 1em;
  border-left: 4px solid #5b7894;
  background: #f3f6f8;
  line-height: 1.45;
`

/* stylelint-disable unit-whitelist */
const Filters = styled.div`
  display: grid;
  grid-template-columns: minmax(230px, 2fr) repeat(3, minmax(150px, 1fr));
  gap: 0.8em;
  align-items: end;
  max-width: 1100px;
  padding: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 1.5em 0 1em;
  background: #fafafa;

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    font-weight: 600;
  }

  input,
  select {
    box-sizing: border-box;
    min-height: 44px;
    padding: 0.45em;
    font: inherit;
  }

  @media (max-width: 850px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`
/* stylelint-enable unit-whitelist */

const ResultsSummary = styled.p`
  font-weight: 600;
`

const TableScroller = styled.div`
  overflow-x: auto;
  width: 100%;
  overscroll-behavior-inline: contain;

  table {
    min-width: 1180px;
  }

  th,
  td {
    padding: 0.55em;
    vertical-align: top;
  }
`

const MachineTuple = styled.code`
  display: block;
  margin-top: 0.3em;
  color: #555;
  font-size: 0.85em;
  white-space: nowrap;
`

const Status = styled.strong<{
  $kind: 'exact' | 'multiple' | 'none' | 'unavailable' | 'ambiguous'
}>`
  display: inline-block;
  padding: 0.15em 0.45em;
  border: 1px solid
    ${(props) =>
      ({
        exact: '#357a38',
        multiple: '#8a6d1d',
        none: '#777',
        unavailable: '#8a1c1c',
        ambiguous: '#8a1c1c',
      }[props.$kind])};
  border-radius: 3px;
  margin-bottom: 0.35em;
  color: inherit;
  font-size: 0.85em;
`

const CandidateList = styled.ul`
  padding-left: 1.2em;
  margin: 0.25em 0 0;
  overflow-wrap: anywhere;
`

const ReasonCode = styled.small`
  display: block;
  margin-top: 0.25em;
  color: #555;
  overflow-wrap: anywhere;
`

const Pagination = styled.nav`
  display: flex;
  align-items: center;
  gap: 1em;
  margin: 1em 0 2em;

  button {
    min-height: 44px;
    padding: 0.45em 0.9em;
  }
`

const shortTandemRepeatUrl = (id: string) =>
  `/short-tandem-repeat/${encodeURIComponent(id)}?dataset=gnomad_r4`

const cohortLabel = { hgsvc_hprc: 'HGSVC/HPRC', aou: 'All of Us' } as const

const CohortResult = ({
  cohort,
  result,
}: {
  cohort: keyof typeof cohortLabel
  result: LongReadTrReferenceCohortResult
}) => {
  let kind: 'exact' | 'multiple' | 'none' | 'unavailable' | 'ambiguous'
  let label: string
  if (isExact(result)) {
    kind = 'exact'
    label = 'Exact reference-component match'
  } else if (isMultiple(result)) {
    kind = 'multiple'
    label = 'Multiple containing LR loci'
  } else if (result.status === 'NONE') {
    kind = 'none'
    label = 'No exact component match'
  } else if (result.status.includes('UNAVAILABLE')) {
    kind = 'unavailable'
    label = 'Cohort unavailable'
  } else {
    kind = 'ambiguous'
    label = 'Ambiguous identity'
  }

  return (
    <div>
      <Status $kind={kind}>{label}</Status>
      {result.candidates.length > 0 && (
        <CandidateList aria-label={`${cohortLabel[cohort]} candidate loci`}>
          {result.candidates.map((candidate) => (
            <li key={candidate.canonical_id}>
              <Link preserveSelectedDataset={false} to={trLocusUrl(candidate.canonical_id, cohort)}>
                {candidate.canonical_id}
              </Link>
            </li>
          ))}
        </CandidateList>
      )}
      {result.reason_code && kind !== 'exact' && (
        <ReasonCode title={`Reason code: ${result.reason_code}`}>{result.reason_code}</ReasonCode>
      )}
    </div>
  )
}

export const LongReadTandemRepeatReferencePage = ({ rows }: { rows: LongReadTrReferenceRow[] }) => {
  const [filters, setFilters] = useState<ReferenceFilters>(defaultReferenceFilters)
  const [page, setPage] = useState(1)
  const chromosomes = useMemo(() => availableChromosomes(rows), [rows])
  const filteredRows = useMemo(() => filterAndSortReferenceRows(rows, filters), [rows, filters])
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const firstIndex = (safePage - 1) * PAGE_SIZE
  const visibleRows = filteredRows.slice(firstIndex, firstIndex + PAGE_SIZE)
  const firstVisible = filteredRows.length === 0 ? 0 : firstIndex + 1
  const lastVisible = firstIndex + visibleRows.length

  const updateFilters = (update: Partial<ReferenceFilters>) => {
    setFilters((current) => ({ ...current, ...update }))
    setPage(1)
  }

  return (
    <Page>
      <DocumentTitle title="Short-read STR ↔ long-read locus reference" />
      <PageHeading>Short-read STR ↔ long-read locus reference</PageHeading>
      <Intro>
        Explore exact GRCh38 reference-component matches between known disease-associated short-read
        tandem-repeat catalog records and canonical long-read tandem-repeat loci.
      </Intro>
      <Boundary>
        These links identify the same reference component by exact coordinates and motif. They do
        not classify long-read alleles, whole-record length changes, genotypes, or individuals.
      </Boundary>

      <Filters aria-label="Reference index filters">
        <label>
          Search
          <input
            type="search"
            value={filters.query}
            placeholder="ID, gene, disease, OMIM, coordinate, motif, or LR locus"
            onChange={(event) => updateFilters({ query: event.target.value })}
          />
        </label>
        <label>
          Chromosome
          <select
            value={filters.chrom}
            onChange={(event) => updateFilters({ chrom: event.target.value })}
          >
            <option value="all">All chromosomes</option>
            {chromosomes.map((chrom) => (
              <option key={chrom} value={chrom}>
                {chrom}
              </option>
            ))}
          </select>
        </label>
        <label>
          Match status
          <select
            value={filters.match}
            onChange={(event) =>
              updateFilters({ match: event.target.value as ReferenceFilters['match'] })
            }
          >
            <option value="all">All statuses</option>
            <option value="either">Exact in either cohort</option>
            <option value="both">Exact in both cohorts</option>
            <option value="hgsvc_hprc_only">HGSVC/HPRC only</option>
            <option value="aou_only">All of Us only</option>
            <option value="none">No exact match in either</option>
            <option value="multiple">Multiple containing loci</option>
            <option value="unavailable_ambiguous">Unavailable or ambiguous</option>
          </select>
        </label>
        <label>
          Sort
          <select
            value={filters.sort}
            onChange={(event) =>
              updateFilters({ sort: event.target.value as ReferenceFilters['sort'] })
            }
          >
            <option value="id">Known STR ID</option>
            <option value="genomic">Genomic coordinate</option>
            <option value="motif">Repeat-unit length and text</option>
            <option value="hgsvc_hprc">HGSVC/HPRC status and count</option>
            <option value="aou">All of Us status and count</option>
          </select>
        </label>
      </Filters>

      <ResultsSummary role="status" aria-live="polite" aria-atomic="true">
        {filteredRows.length.toLocaleString('en-US')} matching loci. Showing{' '}
        {firstVisible.toLocaleString('en-US')}–{lastVisible.toLocaleString('en-US')}.
      </ResultsSummary>

      {filteredRows.length === 0 ? (
        <StatusMessage>No known STR loci match these filters.</StatusMessage>
      ) : (
        <>
          <TableScroller
            role="region"
            aria-label="Known STR reference results"
            data-testid="long-read-tr-reference-table-scroller"
            tabIndex={0}
          >
            <BaseTable>
              <caption className="visually-hidden">
                Known short-read STR loci and exact long-read reference-component matches
              </caption>
              <thead>
                <tr>
                  <th scope="col">Known STR ID and gene</th>
                  <th scope="col">GRCh38 short reference component</th>
                  <th scope="col">Repeat unit</th>
                  <th scope="col">Associated disease(s)</th>
                  <th scope="col">HGSVC/HPRC exact LR locus/status</th>
                  <th scope="col">All of Us exact LR locus/status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => {
                  const record = row.short_record
                  const region = record.main_reference_region
                  return (
                    <tr key={record.id} data-testid="long-read-tr-reference-row">
                      <th scope="row">
                        <Link preserveSelectedDataset={false} to={shortTandemRepeatUrl(record.id)}>
                          {record.id}
                        </Link>
                        <div>{record.gene.symbol}</div>
                      </th>
                      <td>
                        chr{region.chrom}:{(region.start + 1).toLocaleString('en-US')}–
                        {region.stop.toLocaleString('en-US')}
                        <MachineTuple>
                          ({region.chrom}, {region.start}, {region.stop},{' '}
                          {record.reference_repeat_unit})
                        </MachineTuple>
                      </td>
                      <td>
                        <code>{record.reference_repeat_unit}</code> (
                        {record.reference_repeat_unit.length})
                      </td>
                      <td>
                        {record.associated_diseases.length > 0
                          ? record.associated_diseases.map((disease) => (
                              <div key={`${disease.symbol || ''}-${disease.name}`}>
                                {disease.symbol ? `${disease.symbol}: ` : ''}
                                {disease.name}
                                {disease.omim_id ? ` (OMIM ${disease.omim_id})` : ''}
                              </div>
                            ))
                          : 'No associated disease metadata'}
                      </td>
                      <td>
                        <CohortResult cohort="hgsvc_hprc" result={row.hgsvc_hprc} />
                      </td>
                      <td>
                        <CohortResult cohort="aou" result={row.aou} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </BaseTable>
          </TableScroller>
          <Pagination aria-label="Reference index pages">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span>
              Page {safePage} of {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage === pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            >
              Next
            </button>
          </Pagination>
        </>
      )}
    </Page>
  )
}

export const operationName = 'LongReadTandemRepeatReference'
export const query = `
query ${operationName} {
  long_read_tandem_repeat_reference(first: 100, sort: SHORT_ID_ASC) {
    total_count
    nodes {
      short_record {
        id
        gene { symbol }
        main_reference_region { reference_genome chrom start stop }
        reference_repeat_unit
        associated_diseases { name symbol omim_id }
      }
      hgsvc_hprc {
        status reason_code source_database source_release source_run_id
        candidates { canonical_id }
      }
      aou {
        status reason_code source_database source_release source_run_id
        candidates { canonical_id }
      }
    }
    page_info { has_next_page }
  }
}
`

const LongReadTandemRepeatReferencePageContainer = () => (
  <Query
    operationName={operationName}
    query={query}
    loadingMessage="Loading known STR to long-read reference matches"
    errorMessage="Unable to load known STR to long-read reference matches. Match availability cannot be determined."
    success={(data: any) => data.long_read_tandem_repeat_reference}
  >
    {({ data }: any) => {
      const connection = data.long_read_tandem_repeat_reference
      if (connection.page_info.has_next_page || connection.total_count > connection.nodes.length) {
        return (
          <Page>
            <DocumentTitle title="Short-read STR ↔ long-read locus reference" />
            <PageHeading>Short-read STR ↔ long-read locus reference</PageHeading>
            <StatusMessage>
              The bounded reference index response was incomplete. Match availability cannot be
              determined.
            </StatusMessage>
          </Page>
        )
      }
      return <LongReadTandemRepeatReferencePage rows={connection.nodes} />
    }}
  </Query>
)

export default LongReadTandemRepeatReferencePageContainer
