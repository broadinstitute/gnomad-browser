import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExactAlleleIndex } from './LongReadTrVisualizations'
import { LongReadTrAllele } from './types'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

const allele = (af: number | null, index = 1): LongReadTrAllele => ({
  variant_id: `chr1-test~${index}`,
  source_variant_id: 'chr1-test',
  alt_index: index,
  alt_count: 3,
  ref: 'ATT',
  alt: 'ATTT',
  length: 1,
  motif_purity: null,
  freq: { all: { ac: 7, an: 2054, af }, populations: [{ id: 'afr', ac: 3, an: 100, af }] },
})

it('keeps every nullable-AF ALT in the locus index and sorts missing AF after known zero', () => {
  const props = {
    alleles: [allele(null), allele(0, 2), allele(0.1, 3)],
    motifs: ['T'],
    navigation: { hrefForAllele: (id: string) => `?allele=${id}`, onSelectAllele: jest.fn() },
    sequencesAvailable: true,
  }
  const { rerender } = render(<ExactAlleleIndex {...props} />)
  const alleleRows = () =>
    screen
      .getAllByRole('row')
      .filter((row) => row.getAttribute('aria-label')?.startsWith('Source ALT'))
  expect(alleleRows()).toHaveLength(3)
  expect(alleleRows()[0].getAttribute('aria-label')).toContain('AC 7; AF Unavailable')
  fireEvent.click(screen.getByRole('button', { name: /^AF/ }))
  expect(alleleRows().map((row) => row.getAttribute('aria-label')?.split(';')[0])).toEqual([
    'Source ALT 3',
    'Source ALT 2',
    'Source ALT 1',
  ])
  fireEvent.click(screen.getByRole('button', { name: /^AF/ }))
  expect(alleleRows().map((row) => row.getAttribute('aria-label')?.split(';')[0])).toEqual([
    'Source ALT 2',
    'Source ALT 3',
    'Source ALT 1',
  ])
  rerender(<ExactAlleleIndex {...props} selectedDivision="afr" />)
  expect(alleleRows()).toHaveLength(3)
  expect(alleleRows()[2].getAttribute('aria-label')).toContain('AC 3; AF Unavailable')
})
