import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import {
  aggregateGenotypePairs,
  histogramHeightPercent,
  LongReadTrComponentTrack,
  motifColor,
  purityDomain,
  WholeRecordAlleleLandscape,
  WholeRecordGenotypeLandscape,
} from './LongReadTrVisualizations'
import {
  AlleleNavigation,
  GenotypePair,
  LongReadTrAllele,
  LongReadTrLocus,
  WholeRecordAlleleLandscapeData,
  WholeRecordGenotypeLandscapeData,
} from './types'

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
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions', () => () => null)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect', () => () => null)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect', () => () => null)

const sourceId = 'chr4-test'
const makeAllele = (altIndex: number, length: number, ac: number): LongReadTrAllele => ({
  variant_id: `${sourceId}~${altIndex}`,
  source_variant_id: sourceId,
  alt_index: altIndex,
  alt_count: 3,
  length,
  repeat_count: null,
  repeat_count_source: null,
  motif_purity: 0.99,
  freq: { all: { ac, an: 200, af: ac / 200 }, populations: [] },
})

const alleles = [makeAllele(1, -6, 100), makeAllele(2, 0, 25), makeAllele(3, 12, 5)]
const alleleLandscape: WholeRecordAlleleLandscapeData = {
  status: 'AVAILABLE',
  reason_code: null,
  unit: 'WHOLE_RECORD_DELTA_BP',
  called_alleles: 200,
  non_reference_called_alleles: 130,
  reference_called_alleles: 70,
  exact_alt_count: 3,
  stratified_available: false,
  stratified_unavailable_reason: 'NOT_AVAILABLE',
  ancestry_groups: [],
  sexes: [],
  bins: alleles.map((allele) => ({
    delta: allele.length as number,
    called_alleles: allele.freq.all.ac,
    exact_alt_count: 1,
    allele_ids: [allele.variant_id],
    stacks: [],
  })),
  purity_points: [],
  purity_available: false,
  purity_unavailable_reason: 'NOT_AVAILABLE',
}

const navigation: AlleleNavigation = {
  hrefForAllele: (alleleId) => `?allele=${alleleId}`,
  onSelectAllele: jest.fn(),
}

const duplicatePairs: GenotypePair[] = [
  {
    shorter_allele_id: `${sourceId}~1`,
    longer_allele_id: `${sourceId}~2`,
    ancestry_group: 'afr',
    sex: 'XX',
    people: 4,
    phased_people: 3,
    unphased_people: 1,
  },
  {
    shorter_allele_id: `${sourceId}~1`,
    longer_allele_id: `${sourceId}~2`,
    ancestry_group: 'nfe',
    sex: 'XY',
    people: 6,
    phased_people: 2,
    unphased_people: 4,
  },
  {
    shorter_allele_id: `${sourceId}~3`,
    longer_allele_id: `${sourceId}~2`,
    ancestry_group: 'afr',
    sex: 'XX',
    people: 2,
    phased_people: 2,
    unphased_people: 0,
  },
]

beforeEach(() => (navigation.onSelectAllele as jest.Mock).mockClear())

describe('long-read TR visualization fidelity', () => {
  test('uses proportional histogram heights with truthful zero, linear, log, and capped domains', () => {
    expect(histogramHeightPercent(0, 100, 'linear')).toBe(0)
    expect(histogramHeightPercent(25, 100, 'linear')).toBe(25)
    expect(histogramHeightPercent(100, 100, 'linear')).toBe(100)
    expect(histogramHeightPercent(50, 100, 'linear-truncated-50')).toBe(100)
    expect(histogramHeightPercent(10, 100, 'log')).toBeLessThan(
      histogramHeightPercent(100, 100, 'log')
    )
  })

  test('keeps sparse bars compact and synchronizes the selected bin without hiding exact choices', async () => {
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        selectedAllele={alleles[0].variant_id}
        navigation={navigation}
      />
    )
    expect(screen.getByRole('list', { name: 'Exact alleles at −6 bp' })).not.toBeNull()

    const histogram = screen.getByLabelText('Whole-record delta histogram')
    expect(histogram.parentElement?.parentElement?.getAttribute('data-bin-count')).toBe('3')
    expect(
      screen
        .getByRole('button', { name: /−6 bp, 100 called allele copies/ })
        .getAttribute('data-bar-width')
    ).toBe('48')

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={{ ...alleleLandscape, bins: [...(alleleLandscape.bins || [])] }}
        alleles={[...alleles]}
        selectedAllele={alleles[2].variant_id}
        navigation={navigation}
      />
    )
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Exact alleles at +12 bp' })).not.toBeNull()
    )

    fireEvent.click(screen.getByRole('button', { name: /0 bp, 25 called allele copies/ }))
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    const exactAlleles = screen.getByRole('list', { name: 'Exact alleles at 0 bp' })
    const exactLink = within(exactAlleles).getByRole('link', { name: /Select ALT 2/ })
    expect(exactLink.getAttribute('href')).toBe(`?allele=${alleles[1].variant_id}`)
    fireEvent.click(exactLink)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(alleles[1].variant_id)

    const tallest = screen.getByRole('button', { name: /−6 bp, 100 called allele copies/ })
    const shortest = screen.getByRole('button', { name: /\+12 bp, 5 called allele copies/ })
    expect(Number(tallest.getAttribute('data-height-percent'))).toBeGreaterThan(
      Number(shortest.getAttribute('data-height-percent'))
    )
    expect(screen.getByText(/numbers above bars are exact ALTs/)).not.toBeNull()
  })

  test('lists every same-length exact ALT as a keyboard-operable selection link', () => {
    const sameLengthAllele = makeAllele(4, -6, 7)
    const landscape = {
      ...alleleLandscape,
      exact_alt_count: 4,
      bins: [
        {
          ...(alleleLandscape.bins || [])[0],
          called_alleles: 107,
          exact_alt_count: 2,
          allele_ids: [alleles[0].variant_id, sameLengthAllele.variant_id],
        },
        ...(alleleLandscape.bins || []).slice(1),
      ],
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={landscape}
        alleles={[...alleles, sameLengthAllele]}
        selectedAllele={alleles[0].variant_id}
        navigation={navigation}
      />
    )

    const picker = screen.getByRole('list', { name: 'Exact alleles at −6 bp' })
    const links = within(picker).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links.map((link) => link.textContent)).toEqual(['ALT 1 · AC 100', 'ALT 4 · AC 7'])
    expect(links[0].getAttribute('aria-current')).toBe('true')
    fireEvent.keyDown(links[1], { key: 'Enter' })
    fireEvent.click(links[1])
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(sameLengthAllele.variant_id)
  })

  test('pads and uniquely formats constant-purity axes and makes every point selectable', () => {
    expect(purityDomain([1, 1, 1])).toEqual([0.99, 1])
    const landscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      purity_available: true,
      purity_unavailable_reason: null,
      purity_points: alleles.map((allele) => ({
        allele_id: allele.variant_id,
        delta: allele.length as number,
        motif_purity: 1,
        called_alleles: allele.freq.all.ac,
      })),
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={landscape}
        alleles={alleles}
        selectedAllele={alleles[0].variant_id}
        navigation={navigation}
      />
    )

    const scatter = screen.getByRole('group', { name: /3 exact alleles plotted/ })
    expect(scatter.getAttribute('data-purity-domain')).toBe('0.990000:1.000000')
    const tickLabels = within(scatter)
      .getAllByTestId('purity-axis-tick')
      .map((tick) => tick.textContent)
    expect(new Set(tickLabels).size).toBe(3)
    expect(tickLabels).toEqual(['0.9900', '0.9950', '1.0000'])

    const point = within(scatter).getByRole('link', {
      name: /Select ALT 3, \+12 bp, purity 1.0000/,
    })
    expect(point.getAttribute('href')).toBe(`?allele=${alleles[2].variant_id}`)
    expect(point.getAttribute('style')).toContain('bottom: 94%')
    fireEvent.click(point)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(alleles[2].variant_id)
  })

  test('aggregates stratum rows into reconciled unique exact pairs', () => {
    expect(aggregateGenotypePairs(duplicatePairs)).toEqual([
      {
        shorter_allele_id: `${sourceId}~1`,
        longer_allele_id: `${sourceId}~2`,
        people: 10,
        phased_people: 5,
        unphased_people: 5,
      },
      {
        shorter_allele_id: `${sourceId}~2`,
        longer_allele_id: `${sourceId}~3`,
        people: 2,
        phased_people: 2,
        unphased_people: 0,
      },
    ])
  })

  test('shows the full responsive heatmap context, axes, zero, intensity, and aggregated detail', () => {
    const landscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: '__REFERENCE__',
      called_samples: 12,
      called_alleles: 24,
      ancestry_groups: ['afr', 'nfe'],
      sexes: ['XX', 'XY'],
      cells: [{ shorter_delta: -6, longer_delta: 12, people: 12, pairs: duplicatePairs }],
    }
    render(<WholeRecordGenotypeLandscape landscape={landscape} navigation={navigation} />)

    const heatmap = screen.getByRole('grid', { name: 'Whole-record genotype heatmap' })
    expect(heatmap.tagName.toLowerCase()).toBe('svg')
    expect(within(heatmap).getByText('Longer allele ALT − REF length (bp)')).not.toBeNull()
    expect(within(heatmap).getByText('Shorter allele ALT − REF length (bp)')).not.toBeNull()
    expect(screen.getByLabelText('Logarithmic people intensity legend')).not.toBeNull()
    expect(
      screen
        .getByRole('gridcell', { name: '+12 bp longer, −6 bp shorter: 12 people' })
        .getAttribute('aria-selected')
    ).toBe('true')
    expect(
      screen.getByText(
        (_text, element) =>
          element?.tagName.toLowerCase() === 'p' &&
          Boolean(element.textContent?.includes('12 people across 2 unique exact allele pairs'))
      )
    ).not.toBeNull()
  })

  test('uses one stable color per motif and exposes a compact legend without inflated components', () => {
    const locus = {
      components: [
        { chrom: '4', start0: 0, end0: 1, motif: 'CCG' },
        { chrom: '4', start0: 2, end0: 3, motif: 'CCT' },
        { chrom: '4', start0: 4, end0: 5, motif: 'CCG' },
      ],
      region: { chrom: '4', start0: 0, end0: 100, size: 100 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} />)

    expect(motifColor('CCG')).toBe(motifColor('CCG'))
    expect(motifColor('CCG')).not.toBe(motifColor('CCT'))
    const legend = screen.getByLabelText('Repeat motif color legend')
    expect(within(legend).getAllByText('CCG')).toHaveLength(1)
    expect(within(legend).getAllByText('CCT')).toHaveLength(1)
    expect(
      Number(screen.getByRole('img').querySelectorAll('rect')[0].getAttribute('width'))
    ).toBeCloseTo(8.8)
  })
})
