import React from 'react'
import 'jest-styled-components'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import {
  aggregateGenotypePairs,
  ExactAlleleIndex,
  histogramDeltaAxisTicks,
  histogramHeightPercent,
  LongReadTrComponentTrack,
  motifColor,
  purityDomain,
  stackColorFor,
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
jest.mock(
  '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect',
  () =>
    ({ selectedColorBy, setSelectedColorBy }: any) =>
      (
        <select
          aria-label="Color by"
          value={selectedColorBy || ''}
          onChange={(event) => setSelectedColorBy(event.target.value || null)}
        >
          <option value="">None</option>
          <option value="population">Genetic ancestry group</option>
          <option value="sex">Sex</option>
        </select>
      )
)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatScaleSelect', () => () => null)

const sourceId = 'chr4-test'
const makeAllele = (altIndex: number, length: number, ac: number): LongReadTrAllele => ({
  variant_id: `${sourceId}~${altIndex}`,
  source_variant_id: sourceId,
  alt_index: altIndex,
  alt_count: 3,
  ref: null,
  alt: null,
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
  test('renders every bounded simple-locus preview and explicit compact unavailable states', () => {
    const simpleAlleles = [
      { ...makeAllele(1, -1, 100), ref: 'ATTT', alt: 'ATT' },
      { ...makeAllele(2, 1, 25), ref: 'ATTT', alt: 'ATTTT' },
      { ...makeAllele(3, 2, 5), ref: 'ATTT', alt: 'ATTTTT' },
    ]
    const rendered = render(
      <ExactAlleleIndex
        alleles={simpleAlleles}
        motifs={['T']}
        navigation={navigation}
        sequencesAvailable
      />
    )
    const previews = screen.getAllByRole('img', { name: /motif structure preview/ })
    expect(previews).toHaveLength(3)
    const previewUnit = previews[0].querySelector('[data-motif-unit="true"]')
    expect(previewUnit).not.toBeNull()
    expect(previewUnit?.getAttribute('stroke')).toBe('#36454f')
    expect(previewUnit?.getAttribute('stroke-width')).toBe('1')
    expect(previewUnit?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    expect(previewUnit?.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(screen.queryByText(/Restart the GraphQL API/)).toBeNull()

    rendered.rerender(
      <ExactAlleleIndex
        alleles={simpleAlleles.map((allele) => ({ ...allele, ref: null, alt: null }))}
        motifs={['T']}
        navigation={navigation}
        sequencesAvailable
      />
    )
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)

    rendered.rerender(
      <ExactAlleleIndex
        alleles={simpleAlleles.map((allele) => ({ ...allele, ref: null, alt: null }))}
        motifs={['T']}
        navigation={navigation}
        sequencesAvailable={false}
        sequencesUnavailableReason="ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED"
      />
    )
    expect(screen.getByRole('status').textContent).toMatch(
      /allele sequences are too large to preview safely/
    )
    expect(screen.getByRole('status').textContent).not.toMatch(/Restart/)
  })

  test('maps ancestry and sex stack colors by canonical key, independent of API order', () => {
    const ancestryOrder = ['sas', 'nfe', 'eas', 'asj', 'amr', 'afr', 'unknown']
    expect(ancestryOrder.map((category) => stackColorFor('population', category))).toEqual([
      '#FE9A10',
      '#6AA6CE',
      '#128B44',
      '#FF7E4F',
      '#EF1E24',
      '#941494',
      '#8C8C8C',
    ])
    expect(['unknown', 'XY', 'XX'].map((category) => stackColorFor('sex', category))).toEqual([
      '#8C8C8C',
      '#6AA6CE',
      '#F7C3CC',
    ])
  })

  test('labels canonical stack-color legends accessibly', () => {
    const stratifiedLandscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      stratified_available: true,
      ancestry_groups: ['nfe', 'afr'],
      sexes: ['XY', 'XX'],
      bins: (alleleLandscape.bins || []).map((bin) => ({
        ...bin,
        stacks: [
          { ancestry_group: 'nfe', sex: null, called_alleles: 4 },
          { ancestry_group: 'afr', sex: null, called_alleles: 3 },
          { ancestry_group: null, sex: 'XY', called_alleles: 2 },
          { ancestry_group: null, sex: 'XX', called_alleles: 1 },
        ],
      })),
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        alleles={alleles}
        motifs={['T']}
        navigation={navigation}
      />
    )

    const colorBy = screen.getByLabelText(/Color by/)
    fireEvent.change(colorBy, { target: { value: 'population' } })
    const ancestryLegend = screen.getByLabelText('Stack color legend')
    expect(
      within(ancestryLegend)
        .getAllByLabelText(/stack color/)
        .map((entry) => entry.getAttribute('data-stack-color'))
    ).toEqual(['#6AA6CE', '#941494'])

    fireEvent.change(colorBy, { target: { value: 'sex' } })
    expect(screen.getByLabelText('XY stack color').getAttribute('data-stack-color')).toBe('#6AA6CE')
    expect(screen.getByLabelText('XX stack color').getAttribute('data-stack-color')).toBe('#F7C3CC')
  })

  test('keeps signed delta ticks adaptive while retaining endpoints, zero, and selection', () => {
    const deltas = Array.from({ length: 41 }, (_, index) => index - 20)
    const ticks = histogramDeltaAxisTicks(deltas, 14, 2, 7)
    expect(ticks.map((tick) => tick.delta)).toEqual(expect.arrayContaining([-20, 0, 7, 20]))
    expect(ticks.length).toBeLessThan(deltas.length)
    expect(ticks.every((tick) => tick.lane >= 0)).toBe(true)
  })

  test('uses proportional histogram heights with truthful zero, linear, log, and capped domains', () => {
    expect(histogramHeightPercent(0, 100, 'linear')).toBe(0)
    expect(histogramHeightPercent(25, 100, 'linear')).toBe(25)
    expect(histogramHeightPercent(100, 100, 'linear')).toBe(100)
    expect(histogramHeightPercent(50, 100, 'linear-truncated-50')).toBe(100)
    expect(histogramHeightPercent(10, 100, 'log')).toBeLessThan(
      histogramHeightPercent(100, 100, 'log')
    )
  })

  test('keeps sparse bars compact and filters the single exact index only on request', () => {
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        selectedAllele={alleles[0].variant_id}
        navigation={navigation}
      />
    )
    const exactIndex = screen.getByRole('table', { name: 'Exact alternate allele index' })
    expect(screen.getByRole('heading', { name: 'All exact ALTs (3)' })).not.toBeNull()
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('4')
    expect(screen.queryByRole('table', { name: /Exact alleles at/ })).toBeNull()

    const histogram = screen.getByLabelText('Total allele length change histogram')
    expect(window.getComputedStyle(histogram).paddingTop).toBe('18px')
    const deltaAxis = screen.getByTestId('whole-record-delta-axis')
    expect(within(deltaAxis).getByLabelText('−6 bp tick').textContent).toBe('−6')
    expect(within(deltaAxis).getByLabelText('0 bp tick').textContent).toBe('0')
    expect(within(deltaAxis).getByLabelText('+12 bp tick').textContent).toBe('+12')
    expect(deltaAxis.getAttribute('aria-label')).toMatch(/−6 bp.*0 bp.*\+12 bp/)
    expect(
      window.getComputedStyle(
        screen.getByRole('button', { name: /−6 bp, 100 called allele copies/ })
      ).backgroundColor
    ).toBe('rgb(156, 39, 176)')
    expect(histogram.closest('[data-bin-count]')?.getAttribute('data-bin-count')).toBe('3')
    expect(
      screen
        .getByRole('button', { name: /−6 bp, 100 called allele copies/ })
        .getAttribute('data-bar-width')
    ).toBe('48')

    fireEvent.click(screen.getByRole('button', { name: /−6 bp, 100 called allele copies/ }))
    expect(
      window.getComputedStyle(
        screen.getByRole('button', { name: /−6 bp, 100 called allele copies/ })
      ).backgroundColor
    ).toBe('rgb(233, 120, 28)')
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '1 of 3 exact ALTs at −6 bp' })
    )
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('2')

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={{ ...alleleLandscape, bins: [...(alleleLandscape.bins || [])] }}
        alleles={[...alleles]}
        selectedAllele={alleles[2].variant_id}
        navigation={navigation}
      />
    )
    expect(screen.getByRole('heading', { name: '1 of 3 exact ALTs at −6 bp' })).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /0 bp, 25 called allele copies/ }))
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '1 of 3 exact ALTs at 0 bp' })
    )
    const exactLink = within(exactIndex).getByRole('link', { name: 'Select ALT 2' })
    expect(exactLink.getAttribute('href')).toBe(`?allele=${alleles[1].variant_id}`)
    fireEvent.click(exactLink)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(alleles[1].variant_id)

    fireEvent.click(screen.getByRole('button', { name: 'Show all exact ALTs' }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'All exact ALTs (3)' })
    )
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('4')

    const tallest = screen.getByRole('button', { name: /−6 bp, 100 called allele copies/ })
    const shortest = screen.getByRole('button', { name: /\+12 bp, 5 called allele copies/ })
    expect(Number(tallest.getAttribute('data-height-percent'))).toBeGreaterThan(
      Number(shortest.getAttribute('data-height-percent'))
    )
    expect(screen.getByText(/numbers above bars are exact alleles/)).not.toBeNull()
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

    fireEvent.click(screen.getByRole('button', { name: /−6 bp, 107 called allele copies/ }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '2 of 4 exact ALTs at −6 bp' })
    )
    const picker = screen.getByRole('table', { name: 'Exact alternate allele index' })
    expect(screen.queryByRole('table', { name: /Exact alleles at/ })).toBeNull()
    const links = within(picker).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(picker).getByText(`${sourceId}~1`)).not.toBeNull()
    expect(within(picker).getByText(`${sourceId}~4`)).not.toBeNull()
    expect(links.map((link) => link.textContent)).toEqual(['Selected', 'Select'])
    expect(links[0].getAttribute('aria-current')).toBe('true')
    expect(links[0].closest('[role="row"]')?.getAttribute('aria-selected')).toBe('true')
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
    expect(window.getComputedStyle(point).backgroundColor).toBe('rgb(156, 39, 176)')
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

    const heatmap = screen.getByRole('grid', { name: 'Genotype length-change heatmap' })
    expect(heatmap.tagName.toLowerCase()).toBe('svg')
    expect(
      screen
        .getByRole('gridcell', { name: '+12 bp longer, −6 bp shorter: 12 people' })
        .getAttribute('fill')
    ).toBe(LONG_READ_PRIMARY_PLOT_COLOR)
    expect(within(heatmap).getByText('Longer allele length change (bp)')).not.toBeNull()
    expect(within(heatmap).getByText('Shorter allele length change (bp)')).not.toBeNull()
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

  test('outlines only the API-authorized component without changing motif fills', () => {
    const locus = {
      motifs: ['CAG', 'CCG'],
      components: [
        { chrom: '4', start0: 0, end0: 12, motif: 'CAG' },
        { chrom: '4', start0: 12, end0: 24, motif: 'CCG' },
        { chrom: '4', start0: 24, end0: 36, motif: 'CCG' },
      ],
      region: { chrom: '4', start0: 0, end0: 36, size: 36 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} highlightedComponentIndex={0} />)

    const track = screen.getByRole('img', { name: /component 1 is outlined/ })
    const highlighted = track.querySelectorAll('[data-catalog-pathogenic-match="true"]')
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0].getAttribute('fill')).toBe(motifColor('CAG', locus.motifs))
    expect(highlighted[0].getAttribute('stroke')).toBe('#111')
    expect(screen.queryByText(/Outlined component 1:/)).toBeNull()
    expect(highlighted[0].textContent).toContain('not a pathogenic long-read component')
    expect(screen.queryByText(/Outlined component 2/)).toBeNull()
    expect(screen.queryByText(/Outlined component 3/)).toBeNull()
  })

  test('uses one stable color per motif and explains ordered reference components accessibly', () => {
    const locus = {
      motifs: ['CCG', 'CCT'],
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
    expect(motifColor('CCG', locus.motifs)).toBe('#1f77b4')
    expect(motifColor('CCT', locus.motifs)).toBe('#ff7f0e')
    expect(screen.queryByLabelText('Repeat motif color legend')).toBeNull()
    expect(
      Number(screen.getByRole('img').querySelectorAll('rect')[0].getAttribute('width'))
    ).toBeCloseTo(8.8)
    expect(screen.getByRole('heading', { name: 'Reference repeat components' })).not.toBeNull()
    fireEvent.click(screen.getByLabelText('About reference repeat components'))
    expect(
      screen.getByText(/ordered reference intervals in the source tandem-repeat definition/)
    ).not.toBeNull()
    expect(screen.getByText(/one-based, inclusive/)).not.toBeNull()
    expect(screen.getByText(/Overlapping intervals use separate lanes/)).not.toBeNull()
    expect(screen.getByText(/interval and order are scientifically meaningful/)).not.toBeNull()
    expect(screen.getByText(/does not infer an alternate sequence or repeat count/)).not.toBeNull()
  })
})
