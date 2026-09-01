import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LongReadTandemRepeatReferencePage, query } from './LongReadTandemRepeatReferencePage'
import {
  LongReadTrReferenceProvenance,
  LongReadTrReferenceRow,
  LongReadTrReferenceStatus,
} from './types'

const EMPTY_SHA = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'
const arCompound = 'X-67545306-67545318-TGC+X-67545400-67545419-GCA'
const arx1 = 'X-25013649-25013697-NGC'
const arx2 = 'X-25013529-25013565-NGC'

const componentFromId = (canonicalId: string) => {
  const [chrom, start0, end0, ...motif] = canonicalId.split('+')[0].split('-')
  return { chrom, start0: Number(start0), end0: Number(end0), motif: motif.join('-') }
}

const result = (
  status: LongReadTrReferenceStatus,
  options: {
    canonicalId?: string
    reasonCode?: string
    diagnosticId?: string
    motifRelation?: string
  } = {}
): LongReadTrReferenceRow['hgsvc_hprc'] => {
  const { canonicalId, reasonCode = null, diagnosticId, motifRelation = 'EXACT' } = options
  const exactComponent = canonicalId ? componentFromId(canonicalId) : null
  const diagnosticComponent = diagnosticId ? componentFromId(diagnosticId) : null
  let proofText = 'One exact ordered component identity is present in the complete admitted index.'
  if (status === 'SOURCE_ABSENT') {
    proofText = 'No exact or overlapping component is present in the complete admitted index.'
  } else if (diagnosticId) {
    proofText = '1 diagnostic ordered component identity is present in the complete admitted index.'
  }
  return {
    status,
    reason_code: reasonCode,
    proof_text: proofText,
    source_database: 'gnomad_lr_y1_full_genome',
    source_release: 'y1',
    source_run_id: 'receipt-bound-run',
    candidates:
      canonicalId && exactComponent
        ? [
            {
              canonical_id: canonicalId,
              matched_component_index: 0,
              matched_component: exactComponent,
              matched_reference_region_index: 0,
              source_record_count: 1,
              source_record_membership_sha256: EMPTY_SHA,
            },
          ]
        : [],
    diagnostic_candidates:
      diagnosticId && diagnosticComponent
        ? [
            {
              canonical_id: diagnosticId,
              ordered_component_index: 0,
              ordered_component: diagnosticComponent,
              motif_relation: motifRelation,
              source_record_count: 1,
              source_record_membership_sha256: EMPTY_SHA,
              source_records: [
                {
                  cohort: 'hgsvc_hprc',
                  chrom: `chr${diagnosticComponent.chrom}`,
                  run_id: 'receipt-bound-run',
                  source_record_id: 'diagnostic-source-record',
                  position: diagnosticComponent.start0,
                },
              ],
              source_records_truncated: false,
            },
          ]
        : [],
    diagnostic_candidate_identity_count: diagnosticId ? 1 : 0,
    diagnostic_candidates_truncated: false,
    diagnostic_candidate_identity_sha256: EMPTY_SHA,
  }
}

const row = (
  id: string,
  chrom: string,
  start: number,
  stop: number,
  motif: string,
  hgsvc_hprc: LongReadTrReferenceRow['hgsvc_hprc'],
  aou: LongReadTrReferenceRow['aou'] = hgsvc_hprc
): LongReadTrReferenceRow => ({
  short_record: {
    id,
    gene: { symbol: id },
    main_reference_region: { reference_genome: 'GRCh38', chrom, start, stop },
    reference_repeat_unit: motif,
    associated_diseases: [{ name: `${id} condition`, symbol: `${id}D`, omim_id: '123456' }],
  },
  hgsvc_hprc,
  aou,
})

const rows = [
  row(
    'AR',
    'X',
    67545316,
    67545385,
    'GCA',
    result('COORDINATE_MISMATCH', {
      reasonCode: 'OVERLAPPING_COMPONENT_WITH_DIFFERENT_BOUNDS',
      diagnosticId: arCompound,
      motifRelation: 'REVERSE_COMPLEMENT_ROTATION',
    })
  ),
  row('ARX_1', 'X', 25013649, 25013697, 'NGC', result('EXACT_UNIQUE', { canonicalId: arx1 })),
  row('ARX_2', 'X', 25013529, 25013565, 'NGC', result('EXACT_UNIQUE', { canonicalId: arx2 })),
  row(
    'BEAN1',
    '16',
    66490398,
    66490453,
    'AAAAT',
    result('ORIENTATION_DIAGNOSTIC', {
      reasonCode: 'EQUAL_BOUNDS_ROTATION_OR_REVERSE_COMPLEMENT',
      diagnosticId: '16-66490398-66490453-TAAAA',
      motifRelation: 'CYCLIC_ROTATION',
    })
  ),
  row(
    'ABSENT',
    '2',
    100,
    120,
    'CAG',
    result('SOURCE_ABSENT', {
      reasonCode: 'NO_EXACT_OR_OVERLAPPING_ADMITTED_COMPONENT',
    })
  ),
  row(
    'AMBIGUOUS',
    '3',
    200,
    220,
    'GAA',
    result('AMBIGUOUS', { reasonCode: 'MULTIPLE_EXACT_ORDERED_COMPONENT_IDENTITIES' })
  ),
  row(
    'STALE',
    '4',
    300,
    320,
    'CGG',
    result('UNAVAILABLE', { reasonCode: 'SOURCE_PROVENANCE_MISMATCH' })
  ),
]

const provenance: LongReadTrReferenceProvenance = {
  dataset: 'gnomad_r4',
  source: 'Frozen gnomAD short-read tandem-repeat catalog snapshot',
  endpoint: 'https://gnomad.broadinstitute.org/api',
  queried_at: '2026-08-24',
  row_count: 78,
  compact_sha256: EMPTY_SHA,
  hard_ceiling: 500,
  reference_genome: 'GRCh38',
  coordinate_system: '0-based half-open',
  motif_identity: 'exact uppercase stored string',
  catalog_available: true,
  catalog_unavailable_reason: null,
  snapshot_contract_id: 'gnomad-short-tr-snapshot-2026-08-24',
  snapshot_contract_label:
    'gnomAD short-read tandem-repeat catalog snapshot captured from the browser catalog on 2026-08-24',
  snapshot_contract_scope:
    'Frozen gnomAD short-read snapshot only; this is not a claim of all current disease-associated loci or current TRExplorer membership.',
  snapshot_approval_state: 'PENDING_SCIENCE_OWNER',
  current_trexplorer_admitted: false,
  admitted_component_index_complete: true,
  admitted_component_index_database: 'gnomad_lr_y1_full_genome',
  admitted_component_index_release: 'y1',
  admitted_component_index_source_count: 48,
  admitted_component_index_source_record_count: 7046218,
  admitted_component_index_canonical_locus_count: 7046218,
  admitted_component_index_ordered_component_count: 7683258,
  admitted_component_index_inventory_sha256: EMPTY_SHA,
  diagnostic_max_candidates_per_status: 12,
  diagnostic_max_source_records_per_candidate: 8,
}

const renderPage = (pageRows = rows) =>
  render(
    <MemoryRouter>
      <LongReadTandemRepeatReferencePage rows={pageRows} provenance={provenance} />
    </MemoryRouter>
  )

describe('LongReadTandemRepeatReferencePage', () => {
  test('requests every bounded proof, diagnostic, source, and snapshot provenance field once', () => {
    expect(query.match(/long_read_tandem_repeat_reference/g)).toHaveLength(1)
    expect(query).toContain('first: 100')
    expect(query).toContain('proof_text')
    expect(query).toContain('diagnostic_candidates {')
    expect(query).toContain('source_records { cohort chrom run_id source_record_id position }')
    expect(query).toContain('diagnostic_candidate_identity_sha256')
    expect(query).toContain('snapshot_contract_scope')
    expect(query).toContain('admitted_component_index_inventory_sha256')
    expect(query).toContain('page_info { has_next_page }')
  })

  test('keeps AR compound diagnostics separate from exact ARX_1 and ARX_2 routes', () => {
    renderPage()

    const ar = within(screen.getByRole('row', { name: /^AR / }))
    expect(ar.getAllByText('No exact component — coordinate/representation mismatch')).toHaveLength(
      2
    )
    expect(ar.queryByLabelText('HGSVC/HPRC candidate loci')).toBeNull()
    expect(ar.queryByLabelText('All of Us candidate loci')).toBeNull()
    const diagnosticLinks = ar.getAllByRole('link', { name: /diagnostic long-read locus/ })
    expect(diagnosticLinks).toHaveLength(2)
    expect(diagnosticLinks[0].textContent).toBe('Open diagnostic LR locus')
    expect(diagnosticLinks[0].getAttribute('href')).toContain(
      `/tandem-repeat/${arCompound}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(
      ar.getAllByText('Diagnostic only — not an exact or clinical/reference match')
    ).toHaveLength(2)
    expect(
      ar.getAllByText(/Disease ranges and motif classifications are not transferred/)
    ).toHaveLength(2)
    ;(
      [
        ['ARX_1', arx1],
        ['ARX_2', arx2],
      ] as const
    ).forEach(([id, canonicalId]) => {
      const exact = within(screen.getByRole('row', { name: new RegExp(`^${id} `) }))
      expect(exact.getAllByText('Exact admitted LR reference component')).toHaveLength(2)
      expect(
        exact.getAllByRole('link', { name: /Open .* long-read locus/ })[0].getAttribute('href')
      ).toContain(`/tandem-repeat/${canonicalId}`)
      expect(exact.queryByText(/Diagnostic only/)).toBeNull()
    })
  })

  test('distinguishes absence, orientation, ambiguity, and stale provenance with bounded proof', () => {
    renderPage()

    expect(screen.getAllByText('No exact admitted LR reference component')).toHaveLength(2)
    expect(screen.getAllByText('No exact component — orientation diagnostic')).toHaveLength(2)
    expect(screen.getAllByText('Exact identity is ambiguous')).toHaveLength(2)
    expect(
      screen.getAllByText('Exact identity unavailable — provenance not validated')
    ).toHaveLength(2)
    expect(screen.getAllByText('Absent from the complete admitted component index')).toHaveLength(2)
    expect(screen.getAllByText('Reference provenance is stale')).toHaveLength(2)
    expect(screen.getAllByText(/Bounded proof:/).length).toBeGreaterThan(0)

    const stale = within(screen.getByRole('row', { name: /^STALE / }))
    fireEvent.click(stale.getAllByText('Match details')[0])
    expect(stale.getAllByText('SOURCE_PROVENANCE_MISMATCH')).toHaveLength(2)
    expect(stale.getAllByText(/Receipt-bound source snapshot/)).toHaveLength(2)
  })

  test('qualifies the frozen gnomAD snapshot and complete admitted-source receipt', () => {
    renderPage()
    fireEvent.click(screen.getByText('Catalog and admitted LR source provenance'))

    expect(screen.getByText(/This is a frozen gnomAD browser snapshot/)).not.toBeNull()
    expect(screen.getByText(/not the current TRExplorer catalog/)).not.toBeNull()
    expect(screen.getByText(/7,046,218 source records/)).not.toBeNull()
    expect(screen.getByText(/7,683,258 ordered components/)).not.toBeNull()
    expect(screen.getByText(/Diagnostics are bounded to 12 component identities/)).not.toBeNull()
  })

  test('paginates and filters every durable nonmatch without selecting diagnostics as exact', () => {
    const pagedRows = Array.from({ length: 55 }, (_, index) => ({
      ...rows[4],
      short_record: {
        ...rows[4].short_record,
        id: `LOCUS${String(index + 1).padStart(2, '0')}`,
        gene: { symbol: `GENE${index + 1}` },
      },
    }))
    renderPage(pagedRows)

    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 2')).not.toBeNull()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'GENE55' },
    })
    expect(screen.getByText('Page 1 of 1')).not.toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/^1 matching loci/)

    fireEvent.change(screen.getByLabelText('Match status'), { target: { value: 'none' } })
    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(1)
    expect(screen.queryByRole('link', { name: /diagnostic long-read locus/ })).toBeNull()
  })
})
