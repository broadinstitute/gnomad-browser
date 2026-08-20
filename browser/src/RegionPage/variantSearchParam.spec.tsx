import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import HaplotypeVariantTable from '../Haplotypes/HaplotypeVariantTable'
import {
  useVariantSearchText,
  variantSearchFromUrl,
  withVariantSearchParam,
} from './variantSearchParam'

jest.mock('../Link', () => ({ children, to, onClick }: any) => (
  <a href={to} onClick={onClick}>
    {children}
  </a>
))

const variant = {
  variant_id: '22-100-A-T',
  source_variant_id: '22-100-A-T',
  lr_cohort: 'hgsvc_hprc',
  chrom: '22',
  pos: 100,
  end: null,
  length: 0,
  ref: 'A',
  alt: 'T',
  allele_type: 'snv',
  filters: [],
  motifs: [],
  rsids: ['rs123'],
  freq: { all: { ac: 1, an: 10, af: 0.1 }, populations: [] },
}

type HarnessProps = {
  variantSearch: string | null
  variants: any[]
}

const SearchHarness = ({ variantSearch, variants }: HarnessProps) => {
  const [searchText, setSearchText] = useVariantSearchText(variantSearch)

  return (
    <>
      <input
        aria-label="variant search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
      <HaplotypeVariantTable
        mode="summary"
        summaryVariants={variants}
        searchText={searchText}
      />
    </>
  )
}

describe('variant_id region URL parameter', () => {
  test('decodes a direct-load value without disturbing other parameters', () => {
    const search =
      '?dataset=gnomad_r4_lr&lr_cohort=aou&show_haplotypes=true&variant_id=22-100-A-T&other=kept'

    expect(variantSearchFromUrl(search)).toBe('22-100-A-T')
    expect(new URLSearchParams(search).get('dataset')).toBe('gnomad_r4_lr')
    expect(new URLSearchParams(search).get('other')).toBe('kept')
  })

  test('decodes encoded identifiers and safely sanitizes malformed values', () => {
    expect(variantSearchFromUrl('?variant_id=22-100-A%3ET%2Fcomplex')).toBe(
      '22-100-A>T/complex'
    )
    expect(variantSearchFromUrl('?variant_id=%00%0922-100-A-T%0A')).toBe('22-100-A-T')
    expect(variantSearchFromUrl('?variant_id=rs123%0Ars456')).toBe('rs123,rs456')
    expect(variantSearchFromUrl(`?variant_id=${'x'.repeat(600)}`)).toHaveLength(512)
    expect(() => variantSearchFromUrl('?variant_id=%E0%A4%A')).not.toThrow()
  })

  test('updates and clears search while preserving unrelated URL state', () => {
    const initial = '?dataset=gnomad_r4_lr&show_haplotypes=true'
    const updated = withVariantSearchParam(initial, ' chr22:100 A>T ')

    expect(new URLSearchParams(updated).get('variant_id')).toBe('chr22:100 A>T')
    expect(new URLSearchParams(updated).get('dataset')).toBe('gnomad_r4_lr')
    expect(new URLSearchParams(updated).get('show_haplotypes')).toBe('true')
    expect(new URLSearchParams(withVariantSearchParam(updated, '')).get('variant_id')).toBeNull()
  })

  test('leaves ordinary URLs without the parameter unfiltered', () => {
    expect(variantSearchFromUrl('?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc')).toBeNull()

    render(<SearchHarness variantSearch={null} variants={[variant]} />)
    expect((screen.getByLabelText('variant search') as HTMLInputElement).value).toBe('')
    expect(screen.getByText('Showing 1 of 1 variants')).not.toBeNull()
  })

  test('retains a no-match value and keeps the table usable', () => {
    render(<SearchHarness variantSearch="not-a-real-variant" variants={[variant]} />)

    expect((screen.getByLabelText('variant search') as HTMLInputElement).value).toBe(
      'not-a-real-variant'
    )
    expect(screen.getByText('Showing 0 of 1 variants')).not.toBeNull()
    expect(screen.getByRole('columnheader', { name: /^Variant/ })).not.toBeNull()
  })

  test('applies the same search when delayed variant data arrives', () => {
    const { rerender } = render(
      <SearchHarness variantSearch="22-100-A-T" variants={[]} />
    )
    expect(screen.getByText('Showing 0 of 0 variants')).not.toBeNull()

    rerender(<SearchHarness variantSearch="22-100-A-T" variants={[variant]} />)
    expect(screen.getByText('Showing 1 of 1 variants')).not.toBeNull()
    expect(screen.getByRole('link', { name: '22-100-A-T' })).not.toBeNull()
  })

  test('uses normalized exact coordinate matching instead of position substrings', () => {
    render(<SearchHarness variantSearch="10" variants={[variant]} />)
    expect(screen.getByText('Showing 0 of 1 variants')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('variant search'), { target: { value: 'RS123' } })
    expect(screen.getByText('Showing 1 of 1 variants')).not.toBeNull()
  })

  test('responds to URL value changes without overwriting later user edits', () => {
    const { rerender } = render(
      <SearchHarness variantSearch="22-100-A-T" variants={[variant]} />
    )
    const input = screen.getByLabelText('variant search') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'rs123' } })
    rerender(<SearchHarness variantSearch="22-100-A-T" variants={[variant]} />)
    expect(input.value).toBe('rs123')

    rerender(<SearchHarness variantSearch="22-101-C-G" variants={[variant]} />)
    expect(input.value).toBe('22-101-C-G')

    rerender(<SearchHarness variantSearch={null} variants={[variant]} />)
    expect(input.value).toBe('')
  })
})
