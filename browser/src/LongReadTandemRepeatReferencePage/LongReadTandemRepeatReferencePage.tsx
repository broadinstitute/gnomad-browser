import React, { useMemo, useState } from 'react'
import styled from 'styled-components'

import { trLocusUrl } from '@gnomad/dataset-metadata/longReadTrLocusId'
import { BaseTable, Page, PageHeading } from '@gnomad/ui'

import DocumentTitle from '../DocumentTitle'
import HaplotypeHelpButton from '../Haplotypes/HelpButton'
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

const HeadingWithHelp = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35em;

  h1 {
    margin-right: 0;
  }
`

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
    width: 100%;
    min-width: 1160px;
    table-layout: fixed;
  }

  th,
  td {
    padding: 0.65em;
    vertical-align: top;
  }

  th:nth-child(1) {
    width: 12%;
  }

  th:nth-child(2) {
    width: 18%;
  }

  th:nth-child(3) {
    width: 9%;
  }

  th:nth-child(4) {
    width: 19%;
  }

  th:nth-child(5),
  th:nth-child(6) {
    width: 21%;
  }
`

const MachineTuple = styled.code`
  display: block;
  margin-top: 0.3em;
  color: #555;
  font-size: 0.85em;
  white-space: nowrap;
`

const CohortCell = styled.div`
  display: grid;
  align-content: start;
  min-width: 0;
  gap: 0.45em;
`

const Status = styled.strong<{
  $kind: 'exact' | 'multiple' | 'none' | 'unavailable' | 'ambiguous'
}>`
  display: inline-block;
  justify-self: start;
  padding: 0.2em 0.55em;
  border: 1px solid
    ${(props) =>
      ({
        exact: '#82bd8a',
        multiple: '#d7b14d',
        none: '#aab2b9',
        unavailable: '#d99090',
        ambiguous: '#d99a68',
      }[props.$kind])};
  border-radius: 999px;
  background: ${(props) =>
    ({
      exact: '#edf8ef',
      multiple: '#fff7dd',
      none: '#f1f3f4',
      unavailable: '#fceded',
      ambiguous: '#fff1e7',
    }[props.$kind])};
  color: ${(props) =>
    ({
      exact: '#245f2b',
      multiple: '#674d09',
      none: '#3f4a53',
      unavailable: '#7b1d1d',
      ambiguous: '#74380d',
    }[props.$kind])};
  font-size: 0.82em;
  line-height: 1.3;
`

const LocusIdentity = styled.span`
  display: block;
  margin-top: 0.15em;
  color: #555;
  font-size: 0.82em;
  line-height: 1.35;
`

const CandidateList = styled.ul`
  display: grid;
  padding: 0;
  margin: 0;
  gap: 0.45em;
  list-style: none;

  li {
    min-width: 0;
  }
`

const Diagnostic = styled.div`
  color: #444;
  font-size: 0.82em;
  line-height: 1.35;

  strong,
  span {
    display: block;
  }

  strong {
    color: #333;
  }
`

const AuditDetails = styled.details`
  color: #555;
  font-size: 0.78em;
  line-height: 1.4;

  summary {
    width: max-content;
    cursor: pointer;
    color: #4c6072;
  }

  div {
    margin-top: 0.3em;
    overflow-wrap: anywhere;
  }

  code {
    font-size: inherit;
  }
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

const ReferenceIndexHelp = () => (
  <HaplotypeHelpButton title="About the short-read to long-read reference index">
    <p style={{ marginTop: 0 }}>
      <strong>What this shows.</strong> Known short-read STR loci and any long-read locus whose LR
      reference component has the same GRCh38 coordinates and stored repeat unit.
    </p>
    <p>
      <strong>How to use it.</strong> Search or filter the table, then open a known STR or an exact
      cohort match. Expand match or technical identity details only when provenance is needed. On a
      narrow screen, scroll the results table horizontally.
    </p>
    <p style={{ marginBottom: 0 }}>
      <strong>What it does not show.</strong> An exact reference identity does not classify a
      long-read allele, genotype, component, person, or total allele length change.
    </p>
  </HaplotypeHelpButton>
)

const shortTandemRepeatUrl = (id: string) =>
  `/short-tandem-repeat/${encodeURIComponent(id)}?dataset=gnomad_r4`

const cohortLabel = { hgsvc_hprc: 'HGSVC/HPRC', aou: 'All of Us' } as const

const diagnosticCopy: Record<string, { label: string; help: string }> = {
  NO_EXACT_COMPONENT: {
    label: 'No matching component',
    help: 'No LR component has both these coordinates and repeat unit.',
  },
  OVERLAP_ONLY: {
    label: 'Overlapping locus only',
    help: 'A locus overlaps this region, but no component matches exactly.',
  },
  REGION_EQUAL_MOTIF_MISMATCH: {
    label: 'Repeat unit differs',
    help: 'Coordinates match an LR component, but its repeat unit differs.',
  },
  MULTIPLE_CONTAINING_LR_LOCI: {
    label: 'More than one containing locus',
    help: 'This component belongs to multiple canonical LR loci; none was selected.',
  },
  DUPLICATE_ORDERED_COMPONENT: {
    label: 'Component mapping is duplicated',
    help: 'The same ordered component was reported more than once.',
  },
  SHORT_RECORD_MATCHES_MULTIPLE_COMPONENTS: {
    label: 'Matches multiple components',
    help: 'This short reference identity matches more than one component in a locus.',
  },
  NON_BIJECTIVE_ORDERED_COMPONENT: {
    label: 'Component mapping is not one-to-one',
    help: 'The catalog record and ordered LR component do not form a unique pair.',
  },
  DUPLICATE_COMPONENT: {
    label: 'Component maps more than once',
    help: 'The same reference component belongs to multiple canonical LR loci.',
  },
  DUPLICATE_CATALOG_EXACT_KEY: {
    label: 'Catalog identity is duplicated',
    help: 'Multiple catalog records share this exact reference identity.',
  },
  DUPLICATE_CATALOG_KEY: {
    label: 'Catalog identity is duplicated',
    help: 'Multiple catalog records share this reference identity.',
  },
  SOURCE_UNAVAILABLE: {
    label: 'Reference source unavailable',
    help: 'This cohort reference source could not be queried.',
  },
  STALE_SOURCE: {
    label: 'Reference source is out of date',
    help: 'This result cannot be confirmed against the current source.',
  },
}

const fallbackDiagnosticLabel = (code: string) => {
  const words = code.toLocaleLowerCase().split('_').join(' ')
  return `${words.charAt(0).toLocaleUpperCase()}${words.slice(1)}`
}

const locusIdentity = (canonicalId: string) => {
  const components = canonicalId.split('+')
  if (components.length > 1) return `${components.length}-component locus`

  const [chrom, start, stop, ...motifParts] = components[0].split('-')
  const numericStart = Number(start)
  const numericStop = Number(stop)
  if (!chrom || !Number.isFinite(numericStart) || !Number.isFinite(numericStop)) return 'LR locus'

  const motif = motifParts.join('-')
  return `chr${chrom}:${numericStart.toLocaleString('en-US')}–${numericStop.toLocaleString(
    'en-US'
  )}${motif ? ` · ${motif}` : ''}`
}

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
    label = 'Exact match'
  } else if (isMultiple(result)) {
    kind = 'multiple'
    label = `${result.candidates.length} possible ${
      result.candidates.length === 1 ? 'locus' : 'loci'
    }`
  } else if (result.status === 'NONE') {
    kind = 'none'
    label = 'No exact match'
  } else if (result.status.includes('UNAVAILABLE')) {
    kind = 'unavailable'
    label = 'Unavailable'
  } else {
    kind = 'ambiguous'
    label = 'Ambiguous'
  }

  const diagnostic = result.reason_code
    ? diagnosticCopy[result.reason_code] || {
        label: fallbackDiagnosticLabel(result.reason_code),
        help: 'Diagnostic reported by the reference index.',
      }
    : null
  const sourceParts = [
    result.source_database ? `Database: ${result.source_database}` : null,
    result.source_release ? `Release: ${result.source_release}` : null,
    result.source_run_id ? `Run: ${result.source_run_id}` : null,
  ].filter(Boolean)
  const hasDetails =
    Boolean(result.reason_code) || result.candidates.length > 0 || sourceParts.length > 0

  return (
    <CohortCell>
      <Status $kind={kind}>{label}</Status>
      {result.candidates.length > 0 && (
        <CandidateList aria-label={`${cohortLabel[cohort]} candidate loci`}>
          {result.candidates.map((candidate, index) => (
            <li key={candidate.canonical_id}>
              <Link
                aria-label={`Open ${cohortLabel[cohort]} long-read locus ${index + 1}`}
                preserveSelectedDataset={false}
                to={trLocusUrl(candidate.canonical_id, cohort)}
              >
                {isExact(result) ? 'Open LR locus' : `Open locus ${index + 1}`}
              </Link>
              <LocusIdentity>{locusIdentity(candidate.canonical_id)}</LocusIdentity>
            </li>
          ))}
        </CandidateList>
      )}
      {diagnostic && (
        <Diagnostic>
          <strong>{diagnostic.label}</strong>
          <span>{diagnostic.help}</span>
        </Diagnostic>
      )}
      {hasDetails && (
        <AuditDetails>
          <summary>Match details</summary>
          {result.reason_code && (
            <div>
              Reason code: <code>{result.reason_code}</code>
            </div>
          )}
          {result.candidates.map((candidate) => (
            <div key={`canonical-id-${candidate.canonical_id}`}>
              Canonical ID: <code>{candidate.canonical_id}</code>
            </div>
          ))}
          {sourceParts.length > 0 && <div>{sourceParts.join(' · ')}</div>}
        </AuditDetails>
      )}
    </CohortCell>
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
      <HeadingWithHelp>
        <PageHeading>Short-read STR ↔ long-read locus reference</PageHeading>
        <ReferenceIndexHelp />
      </HeadingWithHelp>
      <Intro>
        Explore exact GRCh38 reference-component matches between known disease-associated short-read
        tandem-repeat catalog records and canonical long-read tandem-repeat loci.
      </Intro>
      <Boundary>
        These links identify the same reference component by exact coordinates and motif. They do
        not classify long-read alleles, total allele length changes (ALT − REF, bp), genotypes, or
        individuals.
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
                  <th scope="col">HGSVC/HPRC LR match</th>
                  <th scope="col">All of Us LR match</th>
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
                        <AuditDetails>
                          <summary>Technical reference identity</summary>
                          <MachineTuple>
                            ({region.chrom}, {region.start}, {region.stop},{' '}
                            {record.reference_repeat_unit})
                          </MachineTuple>
                        </AuditDetails>
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
            <HeadingWithHelp>
              <PageHeading>Short-read STR ↔ long-read locus reference</PageHeading>
              <ReferenceIndexHelp />
            </HeadingWithHelp>
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
