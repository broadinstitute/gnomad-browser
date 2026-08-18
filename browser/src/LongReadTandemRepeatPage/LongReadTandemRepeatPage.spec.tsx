import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'

jest.mock('../Link', () => ({ children, to, ...props }: any) => (
  <a href={to} {...props}>
    {children}
  </a>
))
jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  Modal: ({ children, title }: any) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}))

const sourceVariantId = 'chr4-39348424-TRV-55'
const exactAllele = `${sourceVariantId}~7`
const locus = {
  id: '4-39348424-39348479-AAAAG',
  source_trid: '4-39348424-39348479-AAAAG',
  chrom: '4',
  motifs: ['AAAAG'],
  structure: '(AAAAG)n',
  lr_cohort: 'hgsvc_hprc' as const,
  source_release: 'y1',
  source_run_id: 'run-hgsvc',
  total_alleles: 200,
  unique_carrier_count: 492,
  selected_allele_valid: true,
  components: [{ chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' }],
  source_records: [
    {
      record_index: 1,
      source_variant_id: sourceVariantId,
      alt_count: 200,
      non_reference_ac: 500,
      an: 582,
      non_reference_af: 0.86,
      source: 'TRGT',
      region: null,
    },
  ],
  short_read_matches: [],
  alleles: {
    nodes: [
      {
        variant_id: exactAllele,
        source_variant_id: sourceVariantId,
        alt_index: 7,
        alt_count: 200,
        ref: 'AAAAAG',
        alt: 'AAAAAGAAAAAGAAAAAGAAAAAGAAAAAGAAAAAG',
        length: -5,
        repeat_count: 10,
        repeat_count_source: 'source_mc_allele',
        motif_purity: 1,
        freq: {
          all: { id: 'all', ac: 135, an: 582, af: 0.231959 },
          populations: [{ id: 'afr', ac: 20, an: 100, af: 0.2 }],
        },
      },
    ],
    page_info: { has_next_page: true, end_cursor: 'cursor' },
  },
}

const renderPage = (selectedAllele = exactAllele) =>
  render(
    <ThemeProvider
      theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
    >
      <LongReadTandemRepeatPage
        datasetId="gnomad_r4_lr"
        locus={locus}
        selectedAllele={selectedAllele}
        onCohortChange={jest.fn()}
        onNextPage={jest.fn()}
      />
    </ThemeProvider>
  )

describe('canonical long-read tandem-repeat locus page', () => {
  test('uses explicit coordinate conversion for display and UCSC', () => {
    renderPage()
    expect(screen.getAllByText(/39,348,425/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'UCSC' }).getAttribute('href')).toContain(
      'chr4%3A39348425-39348479'
    )
  })

  test('renders a selected exact allele as one fixed row with old URL compatibility', () => {
    const { container } = renderPage()
    const rows = container.querySelectorAll('[data-testid="lr-tr-allele-table"] tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].getAttribute('aria-selected')).toBe('true')
    expect(getComputedStyle(rows[0].querySelector('td')!).whiteSpace).toBe('nowrap')
    expect(screen.getByRole('link', { name: 'Open exact' }).getAttribute('href')).toBe(
      `/variant/${exactAllele}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
  })

  test('opens sequence detail in a modal, never a child table row', () => {
    const { container } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Details for ALT 7' }))
    expect(screen.getByRole('dialog', { name: 'ALT 7 details' })).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="lr-tr-allele-table"] tbody tr')).toHaveLength(
      1
    )
    expect(screen.getByText(/not a clinical classification/)).not.toBeNull()
  })
})
