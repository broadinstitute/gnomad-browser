import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { PopulationsTable } from '../VariantPage/PopulationsTable'
import mergeLongReadVariants, { RawLongReadVariant } from '../VariantList/mergeLongReadVariants'
import mergeCallsetData from '../VariantList/mergeCallsetData'
import filterVariants from '../VariantList/filterVariants'
import variantTableColumns from '../VariantList/variantTableColumns'
import { exportVariantsToCsv } from '../VariantList/ExportVariantsButton'
import { makeNumericCompareFunction } from '../VariantList/sortUtilities'
import LongReadVariantPageContent from './LongReadVariantPageContent'
import DeletionAllelicSeriesPlot from './DeletionAllelicSeriesPlot'
import { aggregateSourceEvents, getDeletionAlleleFrequencyPoints } from './sourceEventAggregation'
import { getTrLocusDistribution } from './trLocusAggregation'
import { exportLongReadAf, getLongReadAf, matchesLongReadAfRange, passesMinimumLongReadAf } from './longReadFrequency'
import { getVariantCssColor } from './variantColorUtils'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)
jest.mock('../help/InfoButton', () => () => null)

const raw = (af: number | null, index = 1): RawLongReadVariant => ({
  variant_id: `chr1-100-A-G~${index}`, source_variant_id: 'chr1-100-A-G',
  alt_index: index, alt_count: 3, pos: 100, chrom: '1', end: 101,
  ref: 'A', alt: 'G', allele_type: 'snv', filters: [],
  freq: { all: { ac: 7, an: 2054, af }, populations: [{ id: 'afr', ac: 3, an: 100, af }] },
})

const rows = () => mergeCallsetData({ datasetId: 'gnomad_r4',
  variants: mergeLongReadVariants([], [raw(null), raw(0, 2), raw(0.125, 3)]) })

it('preserves missing AF, known counts, populations and all rows through list merging/filtering', () => {
  const variants = rows()
  expect(variants.map(v => v.af)).toEqual([null, 0, 0.125])
  expect(variants[0]).toMatchObject({ ac: 7, an: 2054, long_read: { populations: [{ ac: 3, an: 100, af: null }] } })
  expect(filterVariants(variants as any, {
    includeCategories: { lof: true, missense: true, synonymous: true, other: true },
    includeFilteredVariants: false, includeSNVs: true, includeIndels: true,
    includeExomes: true, includeGenomes: true, includeLongReads: true,
    includeContext: false, searchText: '',
  }, variantTableColumns)).toHaveLength(3)
  const column = variantTableColumns.find(c => c.key === 'af')!
  const rendered = render(<>{variants.map(v => <div key={v.variant_id}>{column.render(v, 'af', {})}</div>)}</>)
  expect(rendered.container.textContent).toBe('—01.25e-1')
  expect(screen.getByTitle('Allele frequency unavailable')).not.toBeNull()
  const noFrequency = mergeLongReadVariants([], [{ ...raw(null), freq: null }])[0] as any
  expect(noFrequency.long_read).toMatchObject({ ac: null, an: null, af: null })
})

it('sorts unavailable last in both directions, including ties, without treating null as zero', () => {
  const compare = makeNumericCompareFunction('af')
  for (const order of ['ascending', 'descending']) {
    const sorted = [...rows()].sort((a, b) => compare(a, b, order))
    expect(sorted.map(v => v.af)).toEqual(order === 'ascending' ? [0, 0.125, null] : [0.125, 0, null])
    expect(compare({ af: null }, { af: null }, order)).toBe(0)
  }
})

it('does not fall back from explicit nested null to legacy AF and uses a distinct unavailable color', () => {
  expect(getLongReadAf({ freq: { all: { af: null }, af: 0.5 } })).toBeNull()
  expect(getLongReadAf({ freq: { af: 0 } })).toBe(0)
  const color = (af: number | null) => getVariantCssColor(raw(af), 'af', { start: 1, stop: 200 })
  expect(color(null)).not.toBe(color(0))
})

it('has an explicit missing-AF policy for disabled versus active minimum filters', () => {
  expect([null, 0, 0.1].map(af => passesMinimumLongReadAf(af, 0))).toEqual([true, true, true])
  expect([null, 0, 0.1].map(af => passesMinimumLongReadAf(af, 0.01))).toEqual([false, false, true])
  expect([null, 0, 0.1].map(af => matchesLongReadAfRange(af))).toEqual([true, true, true])
  expect([null, 0, 0.1].map(af => matchesLongReadAfRange(af, 0, 0))).toEqual([false, true, false])
  expect([null, 0, 0.1].map(af => matchesLongReadAfRange(af, undefined, 0.05))).toEqual([false, true, false])
  expect([undefined, { af: null }, { af: 0 }].map(exportLongReadAf)).toEqual(['', 'NA', '0'])
})

it('renders detail AF as unavailable without losing AC/AN or deriving population AF', () => {
  render(<LongReadVariantPageContent datasetId="gnomad_r4_lr" variant={{ ...raw(null),
    reference_genome: 'GRCh38', transcript_consequences: [], length: null,
  } as any} />)
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThanOrEqual(3)
  expect(screen.getAllByText('2054')).toHaveLength(2)
  expect(screen.getAllByText('7')).toHaveLength(2)
  expect(screen.queryByText((7 / 2054).toPrecision(4))).toBeNull()
  expect(screen.queryByText('0.03000')).toBeNull()
})

it('uses source AF for populations/subpopulations/total and leaves the legacy count-based table unchanged', () => {
  const populations = [
    { id: 'missing', name: 'Missing', ac: 3, an: 100, af: null, subpopulations: [{ id: 'missing_XX', name: 'XX', ac: 2, an: 50, af: null }] },
    { id: 'zero', name: 'Zero', ac: 0, an: 100, af: 0 },
    { id: 'present', name: 'Present', ac: 5, an: 100, af: 0.04999 },
  ]
  const { container, rerender } = render(<PopulationsTable populations={populations} useSuppliedAf suppliedTotalAc={8} suppliedTotalAn={300} suppliedTotalAf={null} initiallyExpandRows />)
  expect(screen.getAllByText('Unavailable')).toHaveLength(3)
  expect(screen.getByText('0.000')).not.toBeNull()
  expect(screen.getByText('0.04999')).not.toBeNull()
  expect([...container.querySelectorAll('tbody')].map(e => e.textContent?.split('Overall')[0])).toEqual(['Present', 'Zero', 'Missing'])
  fireEvent.click(screen.getByRole('button', { name: 'Allele Frequency' }))
  expect(container.querySelectorAll('tbody')[2].textContent).toContain('Missing')
  rerender(<PopulationsTable populations={populations} />)
  expect(screen.getByText('0.03000')).not.toBeNull()
})

it('omits only unavailable AF points from the AF plot, retaining alleles and count-based distributions', () => {
  const alleles = [null, 0, 0.2].map((af, i) => ({ ...raw(af, i + 1),
    start: 100, stop: 110, end: 110, allele_length: -10 - i, main_reference_region: null,
  }))
  const event = aggregateSourceEvents(alleles)[0]
  expect(event.alleles).toHaveLength(3)
  const points = getDeletionAlleleFrequencyPoints(event.alleles)
  expect(points.map(p => p.af)).toEqual([null, 0, 0.2])
  const { container } = render(<DeletionAllelicSeriesPlot points={points} />)
  expect(container.querySelectorAll('circle')).toHaveLength(2)
  expect(screen.getByLabelText('11 bp, AF 0')).not.toBeNull()
  expect(getTrLocusDistribution(alleles).reduce((sum, p) => sum + p.count, 0)).toBe(9)
  expect(event.alleles).toHaveLength(3)
})

it('exports missing AF as NA, numeric zero as zero, and unchanged known counts', () => {
  const blob = jest.fn((parts: string[]) => ({ parts }))
  const originalBlob = global.Blob
  const originalCreate = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  ;(global as any).Blob = blob
  URL.createObjectURL = jest.fn(() => 'blob:test')
  URL.revokeObjectURL = jest.fn()
  try {
    exportVariantsToCsv(rows() as any, 'gnomad_r4', 'nullable-af')
    const lines = blob.mock.calls[0][0][0].trim().split('\n').map(line => line.split(','))
    const af = lines[0].findIndex(label => label.includes('Allele Frequency'))
    const ac = lines[0].findIndex(label => label === 'Allele Count')
    expect(af).toBeGreaterThan(-1)
    expect(lines.slice(1).map(line => line[af])).toEqual(['NA', '0', '0.125'])
    expect(lines.slice(1).map(line => line[ac])).toEqual(['7', '7', '7'])
    const lrAf = lines[0].indexOf('Long-read allele frequency')
    expect(lines.slice(1).map(line => line[lrAf])).toEqual(['NA', '0', '0.125'])
  } finally {
    global.Blob = originalBlob
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
    click.mockRestore()
  }
})
