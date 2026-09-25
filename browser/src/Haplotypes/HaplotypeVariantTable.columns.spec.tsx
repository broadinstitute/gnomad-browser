import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import userPreferences from '../userPreferences'
import HaplotypeVariantTable, {
  DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS,
} from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, preserveSelectedDataset: _preserve, ...props }: any) => (
  <a href={to} {...props}>
    {children}
  </a>
))

jest.mock('../userPreferences', () => ({
  __esModule: true,
  default: {
    getPreference: jest.fn(),
    savePreference: jest.fn(() => Promise.resolve()),
  },
}))

const mockedPreferences = userPreferences as jest.Mocked<typeof userPreferences>

const variant = (overrides: Record<string, unknown> = {}) => ({
  variant_id: 'canonical-record~1',
  source_variant_id: 'source-vcf-record-007',
  alt_index: 1,
  alt_count: 1,
  lr_cohort: 'hgsvc_hprc',
  chrom: 'chr22',
  pos: 100,
  end: 100,
  length: 0,
  ref: 'A',
  alt: 'T',
  allele_type: 'snv',
  filters: [],
  motifs: [],
  rsids: [],
  freq: { all: { ac: 1, an: 10, af: 0.1 }, populations: [] },
  ...overrides,
})

beforeEach(() => {
  mockedPreferences.getPreference.mockReset()
  mockedPreferences.getPreference.mockReturnValue(undefined)
  mockedPreferences.savePreference.mockReset()
  mockedPreferences.savePreference.mockResolvedValue(undefined as never)
})

describe('long-read variant table identity columns', () => {
  test('labels the human identity Variant and keeps the source Variant ID hidden by default', () => {
    render(<HaplotypeVariantTable mode="summary" summaryVariants={[variant()]} />)

    expect(screen.getByRole('columnheader', { name: /^Variant$/ })).not.toBeNull()
    expect(screen.queryByRole('columnheader', { name: /^Variant ID/ })).toBeNull()
    expect(screen.queryByText('source-vcf-record-007')).toBeNull()
    expect(screen.getByRole('link', { name: '22-100-A-T' })).not.toBeNull()
  })

  test('enables and disables the exact source VCF ID with the standard table chooser', () => {
    render(<HaplotypeVariantTable mode="summary" summaryVariants={[variant()]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Configure table' }))
    const sourceIdCheckbox = screen.getByRole('checkbox', { name: /Variant ID/ })
    expect((sourceIdCheckbox as HTMLInputElement).checked).toBe(false)
    fireEvent.click(sourceIdCheckbox)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('columnheader', { name: /^Variant ID/ })).not.toBeNull()
    expect(screen.getByText('source-vcf-record-007').getAttribute('title')).toBe(
      'source-vcf-record-007'
    )
    expect(mockedPreferences.savePreference).toHaveBeenLastCalledWith(
      'longReadVariantTableColumns',
      expect.arrayContaining(['source_variant_id'])
    )

    fireEvent.click(screen.getByRole('button', { name: 'Configure table' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Variant ID/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.queryByRole('columnheader', { name: /^Variant ID/ })).toBeNull()
  })

  test('loads persisted columns and Restore defaults hides source identity again', () => {
    mockedPreferences.getPreference.mockReturnValue([
      'source_variant_id',
      ...DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS,
    ])
    const { container } = render(
      <HaplotypeVariantTable mode="summary" summaryVariants={[variant()]} />
    )
    expect(screen.getByRole('columnheader', { name: /^Variant ID/ })).not.toBeNull()
    expect(
      Array.from(container.querySelectorAll('thead th'))
        .slice(0, 3)
        .map((header) => header.textContent)
    ).toEqual(['Variant', 'Variant ID', 'Type'])

    fireEvent.click(screen.getByRole('button', { name: 'Configure table' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore defaults' }))
    expect((screen.getByRole('checkbox', { name: /Variant ID/ }) as HTMLInputElement).checked).toBe(
      false
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.queryByRole('columnheader', { name: /^Variant ID/ })).toBeNull()
    expect(mockedPreferences.savePreference).toHaveBeenLastCalledWith(
      'longReadVariantTableColumns',
      DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS
    )
  })

  test('uses an explicit unavailable fallback only when the source VCF ID is absent', () => {
    mockedPreferences.getPreference.mockReturnValue([
      'source_variant_id',
      ...DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS,
    ])
    render(
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={[variant({ source_variant_id: null })]}
      />
    )

    expect(screen.getByText('Unavailable').getAttribute('title')).toBeNull()
    expect(screen.getByText('Unavailable').closest('td')?.getAttribute('title')).toBe(
      'Source VCF ID unavailable'
    )
  })

  test('abbreviates a long short-read match ID but links and hovers the full one', () => {
    render(
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={[
          variant({
            short_read_match_id:
              '15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC',
          }),
        ]}
      />
    )

    const link = screen.getByRole('link', { name: '15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC' })
    expect(link.textContent).toBe('15-90871538-G-GCGGCGGGCGGAC…GGAGGTGGCGCC')
    expect(link.style.maxWidth).toBe('20ch')
    expect(link.style.overflow).toBe('hidden')
    expect(link.style.textOverflow).toBe('ellipsis')
    expect(link.getAttribute('title')).toBe(
      '15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC'
    )
    expect(link.getAttribute('href')).toBe(
      '/variant/15-90871538-G-GCGGCGGGCGGACGAGCCGGAGCCGGCGGTGGTGGCGGCGGCGGCGGCCGGGGAAGCGCGGAGGTGGCGCC?dataset=gnomad_r4'
    )
  })

  test('describes ancestry bars as normalized AFs, not carrier counts', () => {
    render(<HaplotypeVariantTable mode="summary" summaryVariants={[variant({
      freq: { all: { ac: 1, an: 10, af: 0.1 }, populations: [
        { id: 'afr', af: 0.1, ac: 90, an: 900 },
        { id: 'nfe', af: 0.3, ac: 3, an: 10 },
        { id: 'sas', af: null },
      ] },
    })]} />)
    expect(screen.queryByRole('columnheader', { name: 'Grp AF' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Ancestry AF' }).title).toContain('not carrier counts')
    const bar = screen.getByRole('img', { name: /Ancestry allele frequencies: AFR: 0.1; EUR: 0.3/ })
    expect(bar.getAttribute('aria-label')).toContain('not carrier counts or proportions of carriers')
    expect(bar.querySelector('title')?.textContent).toContain('Missing ancestry AFs are omitted')
    const segments = bar.querySelectorAll('rect')
    expect(segments).toHaveLength(2)
    expect(Number(segments[0].getAttribute('width'))).toBeCloseTo(15)
    expect(Number(segments[1].getAttribute('width'))).toBeCloseTo(45)
  })

  test('hides demo-only SV controls but retains hidden types in All and excludes them in SNV only', () => {
    render(<HaplotypeVariantTable mode="summary" summaryVariants={[
      variant(), variant({ variant_id: 'inversion~1', source_variant_id: 'inversion', pos: 200, allele_type: 'inv' }),
    ]} />)
    for (const name of ['INV', 'MCNV', 'CPX', 'Other / BND / CTX']) {
      expect(screen.queryByRole('checkbox', { name })).toBeNull()
    }
    expect(screen.getByRole('link', { name: '22-200-INV-(0bp)' })).not.toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'SNV' }).closest('label')!.parentElement!.querySelector('button')!)
    expect(screen.queryByRole('link', { name: '22-200-INV-(0bp)' })).toBeNull()
    fireEvent.click(document.querySelector('#lr-variant-type-filter')!.lastElementChild!)
    expect(screen.getByRole('link', { name: '22-200-INV-(0bp)' })).not.toBeNull()
  })

  test('keeps full over-30-base REF and ALT sequences in the Variant tooltip only', () => {
    const ref = `G${'T'.repeat(30)}`
    const alt = `A${'C'.repeat(30)}`
    render(
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={[variant({ ref, alt, allele_type: 'snv' })]}
      />
    )

    const link = screen.getByRole('link', { name: '22-100-SNV-(0bp)' })
    expect(link.textContent).not.toContain(ref)
    expect(link.textContent).not.toContain(alt)
    expect(link.getAttribute('title')).toContain(`Exact REF sequence: ${ref}`)
    expect(link.getAttribute('title')).toContain(`Exact ALT sequence: ${alt}`)
  })
})
