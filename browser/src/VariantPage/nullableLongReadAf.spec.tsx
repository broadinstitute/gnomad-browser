import React from 'react'
import { render, screen } from '@testing-library/react'
import LongReadFrequenciesTable from './LongReadFrequenciesTable'
import { GnomadVariantOccurrenceTable } from './VariantOccurrenceTable'
import type { LongReadSequencingType } from './VariantPage'

jest.mock('../help/InfoButton', () => () => null)
jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

const longRead: LongReadSequencingType = {
  ac: 7, an: 2054, af: null, filters: [], homozygote_ref_count: null,
  homozygote_alt_count: null, heterozygote_count: null,
  populations: [
    { id: 'afr', ac: 7, an: 100, af: null, homozygote_alt_count: null },
    { id: 'nfe', ac: 0, an: 100, af: 0, homozygote_alt_count: null },
  ],
}

it('preserves nullable AF in the mixed short/long-read detail population panel', () => {
  const { container, rerender } = render(<LongReadFrequenciesTable longRead={longRead} />)
  expect(container.querySelector('p')!.textContent).toContain('maximum AF: 0.000')
  expect(screen.getAllByText('Unavailable')).toHaveLength(2)
  expect(screen.getAllByText('7')).toHaveLength(2)
  expect(screen.queryByText('0.07000')).toBeNull()
  rerender(<LongReadFrequenciesTable longRead={{ ...longRead, populations: longRead.populations.slice(0, 1) }} />)
  expect(container.querySelector('p')!.textContent).toBe('Ancestry group maximum AF: Unavailable')
})

it('renders unavailable and genuine zero separately in mixed-detail occurrence rows', () => {
  const variant: any = { variant_id: '1-100-A-G', chrom: '1', long_read: longRead, coverage: {} }
  const { rerender } = render(<GnomadVariantOccurrenceTable variant={variant} datasetId="gnomad_r4" />)
  expect(screen.getByText('Unavailable')).not.toBeNull()
  expect(screen.getByText('2054')).not.toBeNull()
  rerender(<GnomadVariantOccurrenceTable variant={{ ...variant, long_read: { ...longRead, af: 0 } }} datasetId="gnomad_r4" />)
  expect(screen.queryByText('Unavailable')).toBeNull()
  expect(screen.getByRole('rowheader', { name: 'Allele Frequency' }).closest('tr')!.lastElementChild!.textContent).toBe('0.000')
})
