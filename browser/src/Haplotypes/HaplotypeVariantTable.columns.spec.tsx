import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import userPreferences from '../userPreferences'
import HaplotypeVariantTable, {
  DEFAULT_LONG_READ_VARIANT_TABLE_COLUMNS,
} from './HaplotypeVariantTable'

jest.mock('../Link', () => ({ children, to, onClick, title }: any) => (
  <a href={to} onClick={onClick} title={title}>
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

  test('keeps full over-30-base REF and ALT sequences in the Variant tooltip only', () => {
    const ref = `G${'T'.repeat(30)}`
    const alt = `A${'C'.repeat(30)}`
    render(
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={[variant({ ref, alt, allele_type: 'snv' })]}
      />
    )

    const link = screen.getByRole('link', { name: '22:100 SNV 0 bp' })
    expect(link.textContent).not.toContain(ref)
    expect(link.textContent).not.toContain(alt)
    expect(link.getAttribute('title')).toContain(`Exact REF sequence: ${ref}`)
    expect(link.getAttribute('title')).toContain(`Exact ALT sequence: ${alt}`)
  })
})
