import React from 'react'
import { render } from '@testing-library/react'
import { PopulationsTable } from './PopulationsTable'
import LongReadFrequenciesTable from './LongReadFrequenciesTable'
import LongReadVariantPageContent from '../LongReadVariantPage/LongReadVariantPageContent'

jest.mock('../help/InfoButton', () => () => null)
jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

const footer = (container: HTMLElement) => {
  const cells = [...container.querySelector('tfoot tr')!.children].map(cell => cell.textContent)
  return [cells[0], cells[1], cells[2], cells[cells.length - 1]]
}

// Render both real callers, not a mocked PopulationsTable or synthetic prop extractor.
describe.each(['dedicated LR', 'shared variant'] as const)('%s population totals', (route) => {
  test.each([
    { label: 'no subdivisions', populations: [], ac: 7, an: 2054, af: null },
    { label: 'partial subdivisions', populations: [{ id: 'afr', ac: 2, an: 100, af: null }], ac: 7, an: 2054, af: null },
    { label: 'rounded source AF, not count-derived', populations: [], ac: 7, an: 2054, af: 0.00341 },
    { label: 'genuine zero', populations: [], ac: 0, an: 2054, af: 0 },
    { label: 'AN0 supplied AF0', populations: [], ac: 0, an: 0, af: 0 },
    { label: 'AN0 missing AF', populations: [], ac: 0, an: 0, af: null },
  ])('$label', ({ populations, ac, an, af }) => {
    const all = { ac, an, af }
    const { container } = render(route === 'shared variant'
      ? <LongReadFrequenciesTable longRead={{ ...all, populations, filters: [],
          homozygote_ref_count: null, homozygote_alt_count: null, heterozygote_count: null } as any} />
      : <LongReadVariantPageContent datasetId="gnomad_r4_lr" variant={{
          variant_id: 'chr1-100-A-G~1', source_variant_id: 'chr1-100-A-G', alt_index: 1,
          alt_count: 1, pos: 100, chrom: '1', ref: 'A', alt: 'G', allele_type: 'snv',
          filters: [], reference_genome: 'GRCh38', transcript_consequences: [], length: null,
          freq: { all, populations },
        } as any} />)
    expect(footer(container)).toEqual(['Total', String(ac), String(an), af == null ? 'Unavailable' : af.toPrecision(4)])
    const populationRows = container.querySelectorAll('tfoot')[0].parentElement!.querySelectorAll('tbody tr')
    expect(populationRows).toHaveLength(populations.length)
    if (populations.length) {
      expect(populationRows[0].textContent).toContain('Unavailable')
      expect([...populationRows[0].querySelectorAll('td')].slice(0, 2).map(td => td.textContent)).toEqual(['2', '100'])
    }
  })
})

test('missing supplied aggregate counts fail unavailable, never to subgroup sums or zero', () => {
  const { container } = render(<PopulationsTable populations={[]} useSuppliedAf suppliedTotalAf={null} />)
  expect(footer(container)).toEqual(['Total', 'Unavailable', 'Unavailable', 'Unavailable'])
})

test('short-read default still sums ancestry counts, excludes sex rows, and derives AF', () => {
  const populations = [
    { id: 'afr', name: 'African', ac: 2, an: 100, af: null },
    { id: 'nfe', name: 'European', ac: 1, an: 100, af: 0 },
    { id: 'XX', name: 'XX', ac: 2, an: 100, af: null },
  ]
  const { container, rerender } = render(<PopulationsTable populations={populations} />)
  expect(footer(container)).toEqual(['Total', '3', '200', '0.01500'])
  rerender(<PopulationsTable populations={[]} />)
  expect(footer(container)).toEqual(['Total', '0', '0', '0.000'])
})
