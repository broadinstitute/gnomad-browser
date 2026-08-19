import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'
import {
  LONG_READ_TR_ALLELES_PER_PAGE,
  longReadTandemRepeatLocusQuery,
} from './LongReadTandemRepeatPageContainer'

jest.mock(
  '../Link',
  () =>
    ({ children, to, preserveSelectedDataset: _preserve, ...props }: any) =>
      (
        <a href={to} {...props}>
          {children}
        </a>
      )
)

jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Page: ({ children }: any) => <main>{children}</main>,
  PageHeading: ({ children }: any) => <h1>{children}</h1>,
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}))

const sourceVariantId = 'chr4-39348424-TRV-55'
const exactAllele = `${sourceVariantId}~7`
const locus = {
  id: '4-39348424-39348479-AAAAG',
  motifs: ['AAAAG'],
  lr_cohort: 'hgsvc_hprc' as const,
  source_release: 'y1',
  source_run_id: 'run-hgsvc',
  total_alleles: 200,
  selected_allele_valid: true,
  components: [{ chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' }],
  source_records: [{ source_variant_id: sourceVariantId }],
  short_read_matches: [] as { id: string; gene_symbol: string | null }[],
  alleles: {
    nodes: [
      {
        variant_id: exactAllele,
        alt_index: 7,
        length: -5,
        repeat_count: 10,
        repeat_count_source: 'source_mc_allele',
        freq: { all: { ac: 135, an: 582, af: 0.231959 } },
      },
    ],
    page_info: { has_next_page: true, end_cursor: 'cursor' },
  },
}

const renderPage = ({
  displayedLocus = locus,
  selectedAllele = exactAllele,
  onCohortChange = jest.fn(),
  onNextPage = jest.fn(),
}: {
  displayedLocus?: any
  selectedAllele?: string
  onCohortChange?: jest.Mock
  onNextPage?: jest.Mock
} = {}) => {
  const rendered = render(
    <ThemeProvider
      theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
    >
      <LongReadTandemRepeatPage
        datasetId="gnomad_r4_lr"
        locus={displayedLocus}
        selectedAllele={selectedAllele}
        onCohortChange={onCohortChange}
        onNextPage={onNextPage}
      />
    </ThemeProvider>
  )
  return { ...rendered, onCohortChange, onNextPage }
}

describe('long-read tandem-repeat allele index', () => {
  test('puts a compact human locus summary immediately before the allele table', () => {
    renderPage()
    const heading = screen.getByRole('heading', {
      name: 'Tandem repeat at chr4:39,348,425–39,348,479',
    })
    expect(screen.getByText('AAAAG')).not.toBeNull()
    expect(screen.getByText('1 linked component')).not.toBeNull()
    expect(screen.getByText('200 alternate alleles')).not.toBeNull()
    expect((screen.getByLabelText('Cohort') as HTMLSelectElement).value).toBe('hgsvc_hprc')
    expect(heading.closest('header')!.nextElementSibling).toBe(
      screen.getByTestId('lr-tr-allele-table-viewport')
    )
  })

  test('is a fixed-height, single-line ALT-only index with exact detail links', () => {
    const { container } = renderPage()
    const rows = container.querySelectorAll('[data-testid="lr-tr-allele-table"] tbody tr')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).not.toContain('Reference')
    expect(rows[0].textContent).toContain('ALT 7')
    expect(rows[0].getAttribute('aria-selected')).toBe('true')
    expect(getComputedStyle(rows[0].querySelector('td')!).whiteSpace).toBe('nowrap')
    expect(getComputedStyle(screen.getByTestId('lr-tr-allele-table-viewport')).height).toBe('430px')
    expect(screen.getByRole('link', { name: 'View allele' }).getAttribute('href')).toBe(
      `/variant/${exactAllele}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
  })

  test('keeps only index columns and defensible compact values', () => {
    renderPage()
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Allele',
      'Repeat count',
      'Δ length',
      'AC',
      'AN',
      'AF',
      'Details',
    ])
    expect(screen.getByText('10').getAttribute('title')).toBe('source_mc_allele')
    expect(screen.getByText('-5 bp')).not.toBeNull()
    expect(screen.getByText('135')).not.toBeNull()
    expect(screen.getByText('582')).not.toBeNull()
    expect(screen.getByText('0.2320')).not.toBeNull()
  })

  test('retains cohort switching, pagination, and invalid deep-link feedback', () => {
    const onCohortChange = jest.fn()
    const onNextPage = jest.fn()
    renderPage({ onCohortChange, onNextPage })
    fireEvent.change(screen.getByLabelText('Cohort'), { target: { value: 'aou' } })
    expect(onCohortChange).toHaveBeenCalledWith('aou')
    fireEvent.click(screen.getByRole('button', { name: 'Next 50 alleles' }))
    expect(onNextPage).toHaveBeenCalledWith('cursor')
  })

  test('summarizes compound identity without placing the route ID in the title', () => {
    const compound = {
      ...locus,
      id: '1-121606499-121606508-AG+1-121606517-121606536-A',
      motifs: ['AG', 'A'],
      components: [
        { chrom: '1', start0: 121606499, end0: 121606508, motif: 'AG' },
        { chrom: '1', start0: 121606517, end0: 121606536, motif: 'A' },
      ],
    }
    renderPage({ displayedLocus: compound })
    const heading = screen.getByRole('heading', {
      name: 'Tandem repeat at chr1:121,606,500–121,606,536',
    })
    expect(heading.textContent).not.toContain(compound.id)
    expect(screen.getByText('AG + A')).not.toBeNull()
    expect(screen.getByText('2 linked components')).not.toBeNull()
  })

  test('removes dashboard content and leaves terse technical IDs collapsed', () => {
    renderPage()
    expect(screen.queryByText('What this page shows')).toBeNull()
    expect(screen.queryByText(/Repeat-count plots/)).toBeNull()
    expect(screen.queryByText(/Called chromosome/)).toBeNull()
    expect(screen.queryByText(/Known-locus context/)).toBeNull()
    expect(screen.queryByTestId('lr-tr-reference-row')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    const details = screen.getByTestId('lr-tr-technical-details')
    expect(details.hasAttribute('open')).toBe(false)
    expect(details.textContent).toContain(locus.id)
    expect(details.textContent).toContain('run-hgsvc')
    expect(details.textContent).not.toContain('coordinate conventions')
    expect(details.textContent).not.toContain('shared anchor')
  })

  test('shows at most one compact established-resource link', () => {
    renderPage({
      displayedLocus: {
        ...locus,
        short_read_matches: [
          { id: 'HTT', gene_symbol: 'HTT' },
          { id: 'HTT-secondary', gene_symbol: 'HTT' },
        ],
      },
    })
    const links = screen.getAllByRole('link', { name: 'View HTT tandem-repeat details' })
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')
  })

  test('uses a bounded index-only GraphQL request', () => {
    expect(LONG_READ_TR_ALLELES_PER_PAGE).toBe(50)
    expect(longReadTandemRepeatLocusQuery).toContain('$first: Int!')
    expect(longReadTandemRepeatLocusQuery).toContain('first: $first')
    expect(longReadTandemRepeatLocusQuery).not.toContain('repeat_count_plots')
    expect(longReadTandemRepeatLocusQuery).not.toContain('allele_size_distribution')
    expect(longReadTandemRepeatLocusQuery).not.toContain('genotype_distribution')
    expect(longReadTandemRepeatLocusQuery).not.toContain('populations')
    expect(longReadTandemRepeatLocusQuery).not.toMatch(/\balt\b/)
    expect(longReadTandemRepeatLocusQuery).not.toMatch(/\bref\b/)
  })
})
