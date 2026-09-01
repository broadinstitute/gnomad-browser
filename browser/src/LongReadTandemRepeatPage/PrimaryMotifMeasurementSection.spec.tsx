import React from 'react'
import { render, screen } from '@testing-library/react'

import PrimaryMotifMeasurementSection from './PrimaryMotifMeasurementSection'
import { PrimaryMotifMeasurementData } from './types'

const measurement = (
  overrides: Partial<PrimaryMotifMeasurementData> = {}
): PrimaryMotifMeasurementData => ({
  status: 'AVAILABLE',
  reason_code: null,
  motif: 'CAG',
  biological_role: 'coding polyglutamine repeat',
  metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
  unit: 'EXACT_PRIMARY_MOTIF_UNITS',
  scope: 'WHOLE_REPRESENTED_ALLELE',
  called_alleles: 584,
  reference_alleles: 400,
  alternate_alleles: 184,
  alternate_identities_checked: 72,
  bins: [
    { exact_units: 17, allele_copies: 12 },
    { exact_units: 24, allele_copies: 420 },
    { exact_units: 42, allele_copies: 2 },
  ],
  genotype: {
    status: 'AVAILABLE',
    reason_code: null,
    called_diploid_people: 292,
    no_call_people: 0,
    cells: [
      { shorter_exact_units: 17, longer_exact_units: 24, people: 3 },
      { shorter_exact_units: 24, longer_exact_units: 24, people: 43 },
      { shorter_exact_units: 24, longer_exact_units: 42, people: 1 },
    ],
  },
  provenance: {
    product_run_id: 'primary-motif-hgsvc-htt',
    primary_database: 'gnomad_lr_y1_product',
    primary_run_id: 'primary-hgsvc-chr4',
    primary_task_id: 'task-1',
    primary_attempt_id: 'attempt-1',
    source_variant_id: 'chr4-3074876-TRV-164',
    registry_digest: 'a'.repeat(64),
    registry_approval_state: 'REVIEWED',
    algorithm_version: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
    algorithm_sha256: 'b'.repeat(64),
    anchor_rule: 'TRID_ENVELOPE_LEFT_PADDING_BASE_V1',
    source_record_sha256: 'c'.repeat(64),
    allele_receipt_sha256: 'd'.repeat(64),
    genotype_receipt_sha256: 'e'.repeat(64),
    bounds_status: 'complete_no_truncation',
    serialized_bytes: 1000,
    returned_bins: 3,
    returned_cells: 3,
  },
  ...overrides,
})

describe('whole-record exact primary-motif measurement', () => {
  test('renders the required whole-record non-clinical boundary and independent axes', () => {
    render(<PrimaryMotifMeasurementSection measurement={measurement()} />)

    expect(
      screen.getByRole('heading', {
        name: 'Long-read exact CAG units across the represented allele',
      })
    ).not.toBeNull()
    expect(screen.getByTestId('primary-motif-boundary').textContent).toMatch(
      /Whole-record, non-clinical measurement/i
    )
    expect(screen.getByTestId('primary-motif-boundary').textContent).toMatch(
      /not a component repeat count, total length change, source MC\/LPS value, short-read estimate, diagnostic result, or clinical classification/i
    )
    expect(
      screen.getByRole('img', {
        name: 'Exact CAG units on the x axis and allele copies on the y axis',
      })
    ).not.toBeNull()
    expect(screen.queryByText(/pathogenic range|clinical range/i)).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: /filter|select/i })).toBeNull()
  })

  test.each([
    ['TGC', 76, 292, 0],
    ['AAAAG', 200, 291, 1],
  ] as const)(
    'renders source-complete HGSVC %s cells without exact-ALT interaction',
    (motif, altCount, people, noCalls) => {
      const source = measurement({
        motif,
        alternate_identities_checked: altCount,
        genotype: {
          status: 'AVAILABLE',
          reason_code: null,
          called_diploid_people: people,
          no_call_people: noCalls,
          cells: [{ shorter_exact_units: 10, longer_exact_units: 12, people }],
        },
      })
      render(<PrimaryMotifMeasurementSection measurement={source} />)

      const cells = screen.getByTestId('primary-motif-genotype-cells')
      const plot = cells.querySelector('svg')!
      expect(plot.getAttribute('data-source-complete')).toBe('true')
      expect(plot.getAttribute('data-exact-alt-interaction')).toBe('none')
      expect(cells.textContent).toContain(`${people} people with source-complete diploid calls`)
      if (noCalls) expect(cells.textContent).toContain(`${noCalls} no-call`)
    }
  )

  test('keeps AoU allele totals while genotype cells are typed unavailable', () => {
    render(
      <PrimaryMotifMeasurementSection
        measurement={measurement({
          called_alleles: 2050,
          alternate_identities_checked: 682,
          genotype: {
            status: 'UNAVAILABLE',
            reason_code: 'AGGREGATE_ONLY_SOURCE_NO_GT_PAIRING',
            called_diploid_people: null,
            no_call_people: null,
            cells: [],
          },
        })}
      />
    )

    expect(screen.getByText('2,050')).not.toBeNull()
    expect(screen.getByText('682')).not.toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(
      /All of Us is aggregate-only and has no source-complete genotype pairing/i
    )
  })

  test('does not render a candidate or failed product as available', () => {
    const { container } = render(
      <PrimaryMotifMeasurementSection
        measurement={measurement({
          status: 'UNAVAILABLE',
          reason_code: 'PUBLIC_PRODUCT_NOT_APPROVED',
          bins: [],
          provenance: null,
        })}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
