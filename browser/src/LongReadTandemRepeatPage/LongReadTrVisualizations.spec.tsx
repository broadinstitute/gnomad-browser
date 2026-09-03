import React from 'react'
import 'jest-styled-components'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { MotifHighlightedSequence } from '../Haplotypes/TrAlleleStructure'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import {
  aggregateGenotypePairs,
  ExactAlleleIndex,
  histogramDeltaAxisTicks,
  histogramHeightPercent,
  LongReadTrComponentTrack,
  motifColor,
  PURITY_HORIZONTAL_INSET,
  PURITY_MAX_JITTER,
  PURITY_POINT_CLEARANCE,
  purityDomain,
  purityOverlapOffset,
  purityPointDiameter,
  purityScalePosition,
  reconciledFilterOptions,
  stackColorFor,
  WholeRecordAlleleLandscape,
  WholeRecordGenotypeLandscape,
} from './LongReadTrVisualizations'
import {
  AlleleNavigation,
  GenotypePair,
  LongReadTrAllele,
  LongReadTrFilterContract,
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
jest.mock(
  '../ShortTandemRepeatPage/ShortTandemRepeatPopulationOptions',
  () =>
    ({
      populations,
      selectedPopulation,
      selectedSex,
      setSelectedPopulation,
      setSelectedSex,
    }: any) =>
      (
        <>
          <label>
            Genetic ancestry group
            <select
              aria-label="Genetic ancestry group"
              value={selectedPopulation || ''}
              onChange={(event) => setSelectedPopulation(event.target.value || null)}
            >
              <option value="">Global</option>
              {populations.map((population: string) => (
                <option key={population} value={population}>
                  {population}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sex
            <select
              aria-label="Sex"
              value={selectedSex || ''}
              onChange={(event) => setSelectedSex(event.target.value || null)}
            >
              <option value="">All</option>
              <option value="XX">XX</option>
              <option value="XY">XY</option>
            </select>
          </label>
        </>
      )
)
jest.mock(
  '../ShortTandemRepeatPage/ShortTandemRepeatColorBySelect',
  () =>
    ({ selectedColorBy, setSelectedColorBy, allowedColorBys = ['population', 'sex'] }: any) =>
      (
        <select
          aria-label="Color by"
          value={selectedColorBy || ''}
          onChange={(event) => setSelectedColorBy(event.target.value || null)}
        >
          <option value="">None</option>
          {allowedColorBys.includes('population') && (
            <option value="population">Genetic ancestry group</option>
          )}
          {allowedColorBys.includes('sex') && <option value="sex">Sex</option>}
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

const unavailableFilterContract: LongReadTrFilterContract = {
  status: 'UNAVAILABLE',
  reason: 'NO_COMPATIBLE_SHARED_OBSERVATIONS',
  ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
  sex_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL',
  ancestry_groups: [],
  sex_groups: [],
  ancestry_control_redundant: false,
  ancestry_control_redundancy_reason: 'NOT_SOLE_ANCESTRY_STRATUM',
  available_color_dimensions: [],
  allele_color_dimensions: [],
  genotype_color_dimensions: [],
  unstratified_policy:
    'EXPLICIT_SOURCE_UNKNOWN_SEPARATE_AND_FAIL_CLOSED_WITHOUT_COMPATIBLE_DENOMINATORS',
  vocabulary_release: null,
  vocabulary_digest: null,
  source_key_inventory_release: 'SOURCE_KEY_INVENTORY_V1',
  source_key_inventory_digest: 'a'.repeat(64),
  source_release: 'y1',
  source_run_id: 'run-test',
  metadata_source_run_id: null,
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
        excludeValidatedSharedPadding
        sequencesAvailable
      />
    )
    const previews = screen.getAllByRole('img', { name: /exact stored-motif string preview/ })
    expect(previews).toHaveLength(3)
    const previewUnit = previews[0].querySelector('[data-motif-unit="true"]')
    expect(previewUnit).not.toBeNull()
    expect(previewUnit?.getAttribute('stroke')).toBe('#36454f')
    expect(previewUnit?.getAttribute('stroke-width')).toBe('1')
    expect(previewUnit?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
    expect(previewUnit?.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(screen.queryByText(/Restart the GraphQL API/)).toBeNull()
    const emptySelection = screen.getByText(
      'No sequence details shown. Choose Details in a row to view its sequence and aggregate annotations.'
    )
    expect(emptySelection).not.toHaveStyleRule('min-height')
    expect(emptySelection).toHaveStyleRule('padding', '0.65em 0.8em')

    rendered.rerender(
      <ExactAlleleIndex alleles={simpleAlleles} motifs={['T']} navigation={navigation} />
    )
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)

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

  test('uses concise identity and length columns with a compact consistent details control', () => {
    render(
      <ExactAlleleIndex
        alleles={alleles}
        motifs={['CAG']}
        navigation={navigation}
        selectedAllele={alleles[0].variant_id}
        representedRefLength={100}
      />
    )

    const table = screen.getByRole('table', { name: 'Source ALT allele index' })
    ;[
      'Source ALT',
      'Source ID',
      'Motifs',
      'Represented length (bp)',
      'Change from REF (bp)',
      'Purity',
      'AC',
      'AF',
      'Details',
    ].forEach((name) => expect(within(table).getByRole('columnheader', { name })).not.toBeNull())

    const firstRow = within(table).getByTitle(`${sourceId}~1`)
    expect(
      within(firstRow)
        .getAllByRole('cell')
        .map((cell) => cell.textContent)
    ).toEqual(['1', sourceId, 'Unavailable', '94', '−6', '0.9900', '100', '0.5000', 'Details'])
    expect(
      within(firstRow).queryByText(/Sequence 1|Source ALT 1 of|bp represented|bp vs REF/)
    ).toBeNull()

    const details = within(firstRow).getByRole('link', { name: 'Details for Sequence 1' })
    expect(details.textContent).toBe('Details')
    expect(details.getAttribute('aria-current')).toBe('page')
    expect(details).toHaveStyleRule('height', 'calc(2em + 2px)')
    expect(details).toHaveStyleRule('border-radius', '0.5em')
    expect(details).toHaveStyleRule('background', '#f8f9fa')

    const representedLengthSort = within(table).getByRole('button', {
      name: 'Represented length (bp)',
    })
    fireEvent.click(representedLengthSort)
    expect(representedLengthSort.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe(
      'descending'
    )
    expect(within(table).getByTitle(`${sourceId}~3`).getAttribute('aria-rowindex')).toBe('2')
  })

  test('does not guess source ancestry aliases when assigning stack colors', () => {
    const ancestryOrder = ['SAS', 'nfe', 'EAS', 'ASJ', 'AMR', 'AFR', 'unknown']
    expect(ancestryOrder.map((category) => stackColorFor('population', category))).toEqual([
      '#FE9A10',
      '#8C8C8C',
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
    ).toEqual(['#8C8C8C', '#8C8C8C'])

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
    const exactIndex = screen.getByRole('table', { name: 'Source ALT allele index' })
    expect(screen.getByRole('heading', { name: '3 source ALT alleles' })).not.toBeNull()
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('4')
    expect(screen.queryByRole('table', { name: /Exact ALTs at/ })).toBeNull()

    const histogram = screen.getByLabelText('Change from REF (bp) histogram')
    expect(window.getComputedStyle(histogram).paddingTop).toBe('18px')
    const deltaAxis = screen.getByTestId('whole-record-delta-axis')
    expect(within(deltaAxis).getByLabelText('-6 bp tick').textContent).toBe('−6')
    expect(within(deltaAxis).getByLabelText('0 bp tick').textContent).toBe('0')
    expect(within(deltaAxis).getByLabelText('12 bp tick').textContent).toBe('+12')
    expect(deltaAxis.getAttribute('aria-label')).toBe('Change from REF (bp) axis')
    expect(deltaAxis.getAttribute('aria-label')).toHaveLength(25)
    const negativeBar = screen.getByRole('button', {
      name: /−6 bp vs REF; 100 called non-reference allele copies/,
    })
    expect(window.getComputedStyle(negativeBar).backgroundColor).toBe('rgb(156, 39, 176)')
    expect(histogram.closest('[data-bin-count]')?.getAttribute('data-bin-count')).toBe('3')
    expect(negativeBar.getAttribute('data-bar-width')).toBe('48')

    fireEvent.click(negativeBar)
    expect(window.getComputedStyle(negativeBar).backgroundColor).toBe('rgb(233, 120, 28)')
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '1 of 3 source ALT alleles at −6 bp vs REF' })
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
    expect(
      screen.getByRole('heading', { name: '1 of 3 source ALT alleles at −6 bp vs REF' })
    ).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: /0 bp vs REF; 25 called non-reference allele copies/ })
    )
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '1 of 3 source ALT alleles at 0 bp vs REF' })
    )
    const exactLink = within(exactIndex).getByRole('link', { name: 'Details for Sequence 2' })
    expect(exactLink.getAttribute('href')).toBe(`?allele=${alleles[1].variant_id}`)
    fireEvent.click(exactLink)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(alleles[1].variant_id)

    fireEvent.click(screen.getByRole('button', { name: 'Show all source ALT alleles' }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '3 source ALT alleles' })
    )
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('4')

    const tallest = screen.getByRole('button', {
      name: /−6 bp vs REF; 100 called non-reference allele copies/,
    })
    const shortest = screen.getByRole('button', {
      name: /\+12 bp vs REF; 5 called non-reference allele copies/,
    })
    expect(Number(tallest.getAttribute('data-height-percent'))).toBeGreaterThan(
      Number(shortest.getAttribute('data-height-percent'))
    )
    expect(
      screen.getByText(
        'Bar height: called non-reference allele copies. Number above: source ALT identities.'
      )
    ).not.toBeNull()
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

    fireEvent.click(
      screen.getByRole('button', { name: /−6 bp vs REF; 107 called non-reference allele copies/ })
    )
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '2 of 4 source ALT alleles at −6 bp vs REF' })
    )
    const picker = screen.getByRole('table', { name: 'Source ALT allele index' })
    expect(screen.queryByRole('table', { name: /Exact ALTs at/ })).toBeNull()
    const links = within(picker).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(picker).getByTitle(`${sourceId}~1`)).not.toBeNull()
    expect(within(picker).getByTitle(`${sourceId}~4`)).not.toBeNull()
    expect(links.map((link) => link.textContent)).toEqual(['Details', 'Details'])
    expect(links[0].getAttribute('aria-current')).toBe('page')
    expect(links[0].closest('[role="row"]')?.getAttribute('aria-selected')).toBeNull()
    fireEvent.keyDown(links[1], { key: 'Enter' })
    fireEvent.click(links[1])
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(sameLengthAllele.variant_id)
  })

  test('pads constant-purity axes and makes coincident points separate local filter buttons', () => {
    expect(purityDomain([1, 1, 1])).toEqual([0.99, 1])
    const landscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      purity_available: true,
      purity_unavailable_reason: null,
      purity_points: alleles.map((allele, index) => ({
        allele_id: allele.variant_id,
        delta: (index === 1 ? alleles[0].length : allele.length) as number,
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

    const scatter = screen.getByRole('group', { name: /3 source ALT alleles plotted/ })
    expect(scatter.getAttribute('data-purity-domain')).toBe('0.990000:1.000000')
    const tickLabels = within(scatter)
      .getAllByTestId('purity-axis-tick')
      .map((tick) => tick.textContent)
    expect(new Set(tickLabels).size).toBe(3)
    expect(tickLabels).toEqual(['0.9900', '0.9950', '1.0000'])

    const points = within(scatter).getAllByRole('button', {
      name: /Filter the source-ALT index to Sequence/,
    })
    expect(points).toHaveLength(3)
    expect(
      points.slice(0, 2).map((candidate) => candidate.getAttribute('data-overlap-offset'))
    ).toEqual(['-12', '12'])
    expect(screen.getByText('Overlapping points are slightly separated.')).not.toBeNull()
    const point = within(scatter).getByRole('button', {
      name: /Filter the source-ALT index to Sequence 3; \+12 bp vs REF; source-reported motif purity 1.0000/,
    })
    expect(point.getAttribute('aria-pressed')).toBe('false')
    expect(point).toHaveStyleRule('width', '44px')
    expect(point).toHaveStyleRule('height', '44px')
    expect(window.getComputedStyle(point.firstElementChild as Element).backgroundColor).toBe(
      'rgb(156, 39, 176)'
    )
    expect(point.getAttribute('style')).toContain(
      `bottom: calc(100% - ${PURITY_POINT_CLEARANCE}px)`
    )
    const sameDeltaBar = screen.getByRole('button', {
      name: /\+12 bp vs REF; 5 called non-reference allele copies/,
    })
    fireEvent.click(sameDeltaBar)
    expect(sameDeltaBar.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(point, { key: 'Enter' })
    fireEvent.click(point)
    expect(sameDeltaBar.getAttribute('aria-pressed')).toBe('false')
    expect(point.getAttribute('aria-pressed')).toBe('true')
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '1 of 3 source ALT alleles — Sequence 3' })
    )
    fireEvent.click(point)
    expect(screen.getByRole('heading', { name: '3 source ALT alleles' })).not.toBeNull()
  })

  test('keeps boundary AC marks and bounded coincidence jitter inside narrow plots', () => {
    const narrowWidth = 120
    const shortHeight = 190
    const toPixels = (position: ReturnType<typeof purityScalePosition>, extent: number) =>
      (position.percent / 100) * extent + position.pixelOffset
    const minimumX = toPixels(
      purityScalePosition(-33, -33, 3577, PURITY_HORIZONTAL_INSET),
      narrowWidth
    )
    const maximumX = toPixels(
      purityScalePosition(3577, -33, 3577, PURITY_HORIZONTAL_INSET),
      narrowWidth
    )
    const minimumPurity = toPixels(
      purityScalePosition(0.97, 0.97, 1, PURITY_POINT_CLEARANCE),
      shortHeight
    )
    const maximumPurity = toPixels(
      purityScalePosition(1, 0.97, 1, PURITY_POINT_CLEARANCE),
      shortHeight
    )
    const jitterOffsets = Array.from({ length: 6 }, (_, index) => purityOverlapOffset(index, 6))

    expect(minimumX + jitterOffsets[0]).toBe(PURITY_POINT_CLEARANCE)
    expect(maximumX + jitterOffsets[5]).toBe(narrowWidth - PURITY_POINT_CLEARANCE)
    expect(minimumPurity).toBe(PURITY_POINT_CLEARANCE)
    expect(maximumPurity).toBe(shortHeight - PURITY_POINT_CLEARANCE)
    expect(new Set(jitterOffsets).size).toBe(6)
    expect(Math.max(...jitterOffsets.map(Math.abs))).toBe(PURITY_MAX_JITTER)
    const largestAcRadius = purityPointDiameter(100, 1, 100) / 2
    expect(largestAcRadius).toBe(13)
    expect(largestAcRadius).toBeLessThan(PURITY_POINT_CLEARANCE)
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

  test('keeps a reference/reference genotype mark active with an empty exact index', () => {
    const referenceId = '__REFERENCE__'
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: referenceId,
      called_samples: 1,
      called_alleles: 2,
      ancestry_groups: ['afr'],
      sexes: ['XX'],
      cells: [
        {
          shorter_delta: 0,
          longer_delta: 0,
          people: 1,
          pairs: [
            {
              shorter_allele_id: referenceId,
              longer_allele_id: referenceId,
              ancestry_group: 'afr',
              sex: 'XX',
              people: 1,
              phased_people: 0,
              unphased_people: 1,
            },
          ],
        },
      ],
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={alleles}
        navigation={navigation}
      />
    )
    const cell = screen.getByRole('button', {
      name: /0 bp vs REF longer allele, 0 bp vs REF shorter allele: 1 person; filter the source-ALT index/,
    })
    fireEvent.keyDown(cell, { key: 'Enter' })
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('heading', {
        name: '0 of 3 source ALT alleles — selected genotype cell (0 bp vs REF × 0 bp vs REF)',
      })
    ).toBe(document.activeElement)
    expect(
      screen.getByRole('table', { name: 'Source ALT allele index' }).getAttribute('aria-rowcount')
    ).toBe('1')
    expect(screen.getByText(/1 person across 1 exact ALT pair/)).not.toBeNull()
    fireEvent.keyDown(cell, { key: ' ' })
    expect(screen.getByRole('heading', { name: '3 source ALT alleles' })).toBe(
      document.activeElement
    )
  })

  test('reconciles one controlled ancestry and sex filter across all three plots', async () => {
    const stratifiedAlleles = alleles.map((allele) => ({
      ...allele,
      freq: {
        ...allele.freq,
        populations: [
          { id: 'afr', ac: 2, an: 20, af: 0.1 },
          { id: 'afr_XX', ac: 1, an: 10, af: 0.1 },
          { id: 'nfe', ac: 3, an: 20, af: 0.15 },
        ],
      },
    }))
    const stratifiedLandscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      stratified_available: true,
      stratified_unavailable_reason: null,
      ancestry_groups: ['afr', 'nfe'],
      sexes: ['XX', 'XY'],
      bins: (alleleLandscape.bins || []).map((bin) => ({
        ...bin,
        stacks: [
          { ancestry_group: 'afr', sex: null, called_alleles: 2 },
          { ancestry_group: 'afr', sex: 'XX', called_alleles: 1 },
          { ancestry_group: 'nfe', sex: null, called_alleles: 3 },
        ],
      })),
      purity_available: true,
      purity_unavailable_reason: null,
      purity_points: stratifiedAlleles.map((allele) => ({
        allele_id: allele.variant_id,
        delta: allele.length as number,
        motif_purity: allele.motif_purity as number,
        called_alleles: allele.freq.all.ac,
      })),
    }
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: '__REFERENCE__',
      called_samples: 12,
      called_alleles: 24,
      ancestry_groups: ['afr'],
      sexes: ['XX'],
      cells: [{ shorter_delta: -6, longer_delta: 12, people: 12, pairs: duplicatePairs }],
    }
    expect(reconciledFilterOptions(stratifiedLandscape, genotypeLandscape)).toEqual({
      ancestries: ['afr'],
      sexes: ['XX'],
    })

    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={stratifiedAlleles}
        navigation={navigation}
      />
    )
    const filters = screen.getByRole('group', {
      name: 'Shared ancestry and sex filters for total-length plots',
    })
    expect(
      screen.getByRole('group', { name: 'Total-length histogram display controls' })
    ).not.toBeNull()
    expect(within(filters).queryByRole('option', { name: 'nfe' })).toBeNull()
    fireEvent.change(within(filters).getByLabelText('Genetic ancestry group'), {
      target: { value: 'afr' },
    })
    expect(screen.getByText(/6 people with complete called genotypes/)).not.toBeNull()
    expect(
      screen.getByRole('button', {
        name: /\+12 bp vs REF longer allele, −6 bp vs REF shorter allele: 6 people; filter the source-ALT index/,
      })
    ).not.toBeNull()
    expect(
      screen.getByRole('button', {
        name: /−6 bp vs REF; 2 called non-reference allele copies in this view/,
      })
    ).not.toBeNull()

    fireEvent.change(within(filters).getByLabelText('Sex'), { target: { value: 'XX' } })
    expect(
      screen.getByRole('button', {
        name: /−6 bp vs REF; 1 called non-reference allele copy in this view; 1 source ALT allele/,
      })
    ).not.toBeNull()
    expect(screen.getByText(/6 people with complete called genotypes/)).not.toBeNull()

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        genotypeLandscape={{
          ...genotypeLandscape,
          ancestry_groups: ['nfe'],
          sexes: ['XY'],
        }}
        alleles={stratifiedAlleles}
        navigation={navigation}
      />
    )
    await waitFor(() => {
      expect(
        (within(filters).getByLabelText('Genetic ancestry group') as HTMLSelectElement).value
      ).toBe('')
      expect((within(filters).getByLabelText('Sex') as HTMLSelectElement).value).toBe('')
    })
    expect(screen.getByText(/12 people with complete called genotypes/)).not.toBeNull()
  })

  test('intersects bin contributors with positive stratum AC and clears a stale source scope', async () => {
    const stratifiedAlleles = alleles.map((allele, index) => ({
      ...allele,
      freq: {
        ...allele.freq,
        populations: [{ id: 'afr', ac: index === 0 ? 2 : 0, an: 20, af: index === 0 ? 0.1 : 0 }],
      },
    }))
    const landscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      stratified_available: true,
      ancestry_groups: ['afr'],
      sexes: [],
      bins: [
        {
          ...(alleleLandscape.bins || [])[0],
          exact_alt_count: 2,
          allele_ids: [stratifiedAlleles[0].variant_id, stratifiedAlleles[1].variant_id],
          stacks: [{ ancestry_group: 'afr', sex: null, called_alleles: 2 }],
        },
        ...(alleleLandscape.bins || []).slice(1),
      ],
      purity_available: true,
      purity_points: stratifiedAlleles.slice(0, 2).map((allele) => ({
        allele_id: allele.variant_id,
        delta: allele.length as number,
        motif_purity: allele.motif_purity as number,
        called_alleles: allele.freq.all.ac,
      })),
    }
    const scope = { locusId: 'locus-a', cohort: 'hgsvc_hprc', sourceRunId: 'run-a' }
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={landscape}
        markFilterScope={scope}
        alleles={stratifiedAlleles}
        navigation={navigation}
      />
    )
    fireEvent.change(screen.getByLabelText('Genetic ancestry group'), {
      target: { value: 'afr' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /−6 bp vs REF; 2 called non-reference allele copies/ })
    )
    expect(
      screen.getByRole('heading', { name: '1 of 3 source ALT alleles at −6 bp vs REF' })
    ).not.toBeNull()
    const index = screen.getByRole('table', { name: 'Source ALT allele index' })
    expect(within(index).getByTitle(stratifiedAlleles[0].variant_id)).not.toBeNull()
    expect(within(index).queryByTitle(stratifiedAlleles[1].variant_id)).toBeNull()

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={landscape}
        markFilterScope={{ ...scope, sourceRunId: 'run-b' }}
        alleles={stratifiedAlleles}
        navigation={navigation}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '3 source ALT alleles' })).not.toBeNull()
    })
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
    render(
      <WholeRecordGenotypeLandscape
        landscape={landscape}
        navigation={navigation}
        selectedPopulation={null}
        selectedSex={null}
      />
    )

    const heatmap = screen.getByRole('group', {
      name: 'Genotype distribution by change from REF',
    })
    expect(heatmap.tagName.toLowerCase()).toBe('svg')
    expect(heatmap).toHaveStyleRule('width', '100%')
    expect(heatmap).toHaveStyleRule('width', '520px', { media: '(max-width:700px)' })
    const heatmapScroller = screen.getByRole('region', {
      name: 'Genotype length distribution plot',
    })
    expect(heatmapScroller.getAttribute('tabindex')).toBe('0')
    expect(heatmapScroller).toHaveStyleRule('overflow-x', 'hidden')
    expect(heatmapScroller).toHaveStyleRule('overflow-x', 'auto', {
      media: '(max-width:700px)',
    })
    const cell = screen.getByRole('button', {
      name: /\+12 bp vs REF longer allele, −6 bp vs REF shorter allele: 12 people; filter the source-ALT index/,
    })
    expect(cell.getAttribute('fill')).toBe('transparent')
    expect(cell.getAttribute('width')).toBe('48')
    expect(cell.getAttribute('height')).toBe('48')
    expect(heatmap.querySelector(`rect[fill="${LONG_READ_PRIMARY_PLOT_COLOR}"]`)).not.toBeNull()
    expect(within(heatmap).getByText('Longer allele: change from REF (bp)')).not.toBeNull()
    expect(within(heatmap).getByText('Shorter allele: change from REF (bp)')).not.toBeNull()
    expect(screen.getByLabelText('Logarithmic people intensity legend')).not.toBeNull()
    expect(cell.getAttribute('aria-pressed')).toBe('false')
    expect(
      screen.getByText(
        (_text, element) =>
          element?.tagName.toLowerCase() === 'summary' &&
          Boolean(element.textContent?.includes('12 people across 2 exact ALT pairs'))
      )
    ).not.toBeNull()
  })

  test('keeps mismatch bases opaque with readable selected-sequence contrast', () => {
    render(
      <MotifHighlightedSequence
        motifs={['CAG']}
        tokens={[{ type: 'motif', motifIndex: 0, sequence: 'CAT' }]}
      />
    )
    const motifToken = screen.getByLabelText('CAG, 3 bp')
    const mismatch = motifToken.children[2] as HTMLElement
    expect(mismatch.style.background).toBe('rgb(51, 51, 51)')
    expect(mismatch.style.color).toBe('rgb(255, 255, 255)')
    expect(mismatch.style.opacity).toBe('1')
  })

  test('neutrally outlines only the API-authorized exact reference component', () => {
    const locus = {
      motifs: ['CAG', 'CCG'],
      components: [
        { chrom: '4', start0: 0, end0: 12, motif: 'CAG' },
        { chrom: '4', start0: 12, end0: 24, motif: 'CCG' },
        { chrom: '4', start0: 24, end0: 36, motif: 'CCG' },
      ],
      region: { chrom: '4', start0: 0, end0: 36, size: 36 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} exactReferenceComponentIndex={0} />)

    const track = screen.getByRole('img', { name: /component 1 has a neutral dotted outline/ })
    const outlined = track.querySelectorAll('[data-exact-reference-component-match="true"]')
    expect(outlined).toHaveLength(1)
    expect(outlined[0].getAttribute('fill')).toBe(motifColor('CAG', locus.motifs))
    expect(outlined[0].getAttribute('stroke')).toBe('#111')
    expect(outlined[0].getAttribute('stroke-dasharray')).toBe('2 4')
    expect(outlined[0].textContent).toContain('no clinical classification')
    expect(screen.getByLabelText('LR reference component legend').textContent).toContain(
      'Exact short-read catalog reference match (identity only)'
    )
    expect(track.querySelector('[data-catalog-pathogenic-match]')).toBeNull()
  })

  test('keeps all 180 ordered components reachable through a bounded table', () => {
    const components = Array.from({ length: 180 }, (_, index) => ({
      chrom: '3',
      start0: index * 3,
      end0: index * 3 + 2,
      motif: index % 2 ? 'TGC' : 'CAG',
    }))
    const locus = {
      motifs: ['CAG', 'TGC'],
      components,
      region: { chrom: '3', start0: 0, end0: 539, size: 539 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} />)

    fireEvent.click(screen.getByText('Full ordered component table (180)'))
    expect(screen.getByText('Components 1–25 of 180')).not.toBeNull()
    const next = screen.getByRole('button', { name: 'Next components' })
    for (let page = 1; page < 8; page += 1) fireEvent.click(next)
    expect(screen.getByText('Components 176–180 of 180')).not.toBeNull()
    expect(screen.getByRole('rowheader', { name: '180' })).not.toBeNull()
    expect(screen.getByLabelText('Scrollable ordered source component table')).not.toBeNull()
  })

  test('omits fully unavailable landscape controls, messages, spacing, and stale help', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
        representedLength={{
          status: 'UNAVAILABLE',
          reason: 'STORED_DELTA_RECONCILIATION_MISMATCH',
          represented_ref_length_bp: null,
          represented_alt_min_length_bp: null,
          represented_alt_max_length_bp: null,
          source_delta_provenance: 'INFO_ALLELE_LENGTH',
          sequence_length_provenance: null,
          sequence_source_record_digest: null,
          sequence_content_digest: null,
          anchor_rule: null,
          anchor_rule_source: null,
          anchor_rule_release: null,
          anchor_rule_digest: null,
          reconciliation_status: 'MISMATCH',
        }}
        filterContract={unavailableFilterContract}
      />
    )

    expect(screen.queryByLabelText('Length axis')).toBeNull()
    expect(screen.queryByLabelText('Genetic ancestry group')).toBeNull()
    expect(screen.queryByLabelText('Sex')).toBeNull()
    expect(screen.queryByLabelText('Color by')).toBeNull()
    expect(screen.queryByText(/Unavailable pending exact shared vocabulary/)).toBeNull()
    expect(screen.queryByText(/Represented allele length is disabled/)).toBeNull()
    const heading = screen.getByRole('heading', { name: 'Allelic landscape' })
    expect(heading.parentElement?.nextElementSibling?.getAttribute('aria-live')).toBe('polite')
    expect(screen.getByRole('heading', { name: 'Change from REF (bp)' })).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'About the allelic landscape' }))
    const help = screen.getByRole('dialog', { name: 'About the allelic landscape' })
    expect(
      within(help).queryByText(/length-axis control|shared ancestry|y-scale controls/)
    ).toBeNull()
  })

  test('shows only the positively admitted dimension for a partial filter contract', () => {
    const ancestryGroup = {
      id: 'approved-group-a',
      label: 'API group A',
      kind: 'SOURCE_GROUP' as const,
      source_frequency_keys: ['group-a'],
      source_metadata_keys: ['group-a'],
      available_in_frequency: true,
      available_in_genotype: true,
      shared_available: true,
      unavailable_reason: null,
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
        filterContract={{
          ...unavailableFilterContract,
          status: 'PARTIAL',
          reason: 'SEX_MAPPING_NOT_APPROVED',
          ancestry_mapping_status: 'APPROVED_EXACT',
          ancestry_groups: [ancestryGroup],
          available_color_dimensions: ['ANCESTRY'],
          allele_color_dimensions: ['ANCESTRY'],
          genotype_color_dimensions: ['ANCESTRY'],
          vocabulary_release: 'approved-v1',
          vocabulary_digest: 'b'.repeat(64),
        }}
      />
    )

    expect((screen.getByLabelText('Genetic ancestry group') as HTMLSelectElement).disabled).toBe(
      false
    )
    expect(screen.queryByLabelText('Sex')).toBeNull()
    expect(
      within(screen.getByLabelText('Color by')).queryByRole('option', { name: 'Sex' })
    ).toBeNull()
    expect(screen.queryByText(/pending exact shared vocabulary|remain disabled/i)).toBeNull()
  })

  test('omits an AoU ancestry control when exact API redundancy makes it unnecessary', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
        filterContract={{
          ...unavailableFilterContract,
          status: 'AVAILABLE',
          reason: null,
          ancestry_mapping_status: 'APPROVED_EXACT',
          ancestry_groups: [
            {
              id: 'approved-sole-ancestry',
              label: 'Sole source ancestry',
              kind: 'SOURCE_GROUP',
              source_frequency_keys: ['group-a'],
              source_metadata_keys: ['group-a'],
              available_in_frequency: true,
              available_in_genotype: true,
              shared_available: true,
              unavailable_reason: null,
            },
          ],
          ancestry_control_redundant: true,
          ancestry_control_redundancy_reason: 'CERTIFIED_EXACT_SOLE_STRATUM',
          available_color_dimensions: [],
          vocabulary_release: 'approved-v1',
          vocabulary_digest: 'c'.repeat(64),
        }}
      />
    )

    expect(screen.queryByLabelText('Genetic ancestry group')).toBeNull()
    expect(screen.queryByLabelText('Color by')).toBeNull()
    expect(screen.queryByText(/sole ancestry stratum|certified.*redundant/i)).toBeNull()
  })

  test('enables API-admitted shared controls with exact source-key filtering and mobile containment', () => {
    const contractAlleles = alleles.map((allele, index) => ({
      ...allele,
      freq: {
        ...allele.freq,
        populations: [
          { id: 'group-a', ac: index + 1, an: 20, af: (index + 1) / 20 },
          { id: 'source-sex-a', ac: index + 1, an: 20, af: (index + 1) / 20 },
          { id: 'group-a_source-sex-a', ac: index + 1, an: 10, af: (index + 1) / 10 },
        ],
      },
    }))
    const contractLandscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      stratified_available: true,
      stratified_unavailable_reason: null,
      ancestry_groups: ['group-a'],
      sexes: ['source-sex-a'],
      bins: (alleleLandscape.bins || []).map((bin, index) => ({
        ...bin,
        stacks: [
          { ancestry_group: 'group-a', sex: null, called_alleles: index + 1 },
          { ancestry_group: null, sex: 'source-sex-a', called_alleles: index + 1 },
          { ancestry_group: 'group-a', sex: 'source-sex-a', called_alleles: index + 1 },
        ],
      })),
    }
    const contract: LongReadTrFilterContract = {
      ...unavailableFilterContract,
      status: 'AVAILABLE',
      reason: null,
      ancestry_mapping_status: 'APPROVED_EXACT',
      sex_mapping_status: 'APPROVED_EXACT',
      ancestry_groups: [
        {
          id: 'approved-group-a',
          label: 'API group A',
          kind: 'SOURCE_GROUP',
          source_frequency_keys: ['group-a', 'group-a_source-sex-a'],
          source_metadata_keys: ['group-a'],
          available_in_frequency: true,
          available_in_genotype: true,
          shared_available: true,
          unavailable_reason: null,
        },
      ],
      sex_groups: [
        {
          id: 'approved-source-sex-a',
          label: 'API sex group A',
          kind: 'SOURCE_GROUP',
          source_frequency_keys: ['source-sex-a', 'group-a_source-sex-a'],
          source_metadata_keys: ['source-sex-a'],
          available_in_frequency: true,
          available_in_genotype: true,
          shared_available: true,
          unavailable_reason: null,
        },
      ],
      available_color_dimensions: ['ANCESTRY', 'SEX'],
      allele_color_dimensions: ['ANCESTRY', 'SEX'],
      genotype_color_dimensions: ['ANCESTRY', 'SEX'],
      vocabulary_release: 'approved-v1',
      vocabulary_digest: 'd'.repeat(64),
    }
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: '__REFERENCE__',
      called_samples: 4,
      called_alleles: 8,
      ancestry_groups: ['group-a'],
      sexes: ['source-sex-a'],
      cells: [
        {
          shorter_delta: -6,
          longer_delta: 12,
          people: 4,
          pairs: [
            {
              ...duplicatePairs[0],
              ancestry_group: 'group-a',
              sex: 'source-sex-a',
              people: 4,
            },
          ],
        },
      ],
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={contractLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={contractAlleles}
        navigation={navigation}
        filterContract={contract}
      />
    )

    const controls = screen.getByRole('group', { name: 'Allelic landscape controls' })
    expect(Array.from(controls.children).every((child) => child.childElementCount > 0)).toBe(true)
    const group = screen.getByRole('group', {
      name: 'API-admitted ancestry and sex filters for total-length plots',
    })
    expect(group).toHaveStyleRule('min-width', '0')
    expect(group).toHaveStyleRule('max-width', '100%')
    expect(group).toHaveStyleRule('width', '100%', { media: '(max-width:600px)' })
    const ancestry = within(group).getByLabelText('Genetic ancestry group') as HTMLSelectElement
    const sex = within(group).getByLabelText('Sex') as HTMLSelectElement
    expect(ancestry.disabled).toBe(false)
    expect(sex.disabled).toBe(false)
    expect(ancestry.parentElement).toHaveStyleRule('max-width', '100%')
    expect(ancestry.parentElement).toHaveStyleRule('min-height', '44px', { modifier: 'select' })

    fireEvent.change(ancestry, { target: { value: 'approved-group-a' } })
    expect(
      screen.getByText((_text, element) =>
        Boolean(
          element?.getAttribute('aria-live') === 'polite' &&
            element.textContent?.includes(
              '6 called non-reference allele copies in the current filters.'
            )
        )
      )
    ).not.toBeNull()
    expect(screen.getByText(/4 people with complete called genotypes/)).not.toBeNull()
    fireEvent.change(sex, { target: { value: 'approved-source-sex-a' } })
    expect(
      screen.getByText((_text, element) =>
        Boolean(
          element?.getAttribute('aria-live') === 'polite' &&
            element.textContent?.includes(
              '6 called non-reference allele copies in the current filters.'
            )
        )
      )
    ).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Color by'), { target: { value: 'population' } })
    expect(screen.getByLabelText('API group A stack color')).not.toBeNull()
  })

  test('enables one synchronized represented-length axis only for reconciled API lengths', () => {
    const representedLength = {
      status: 'AVAILABLE_EXACT' as const,
      reason: null,
      represented_ref_length_bp: 100,
      represented_alt_min_length_bp: 94,
      represented_alt_max_length_bp: 112,
      source_delta_provenance: 'INFO_ALLELE_LENGTH' as const,
      sequence_length_provenance: 'test',
      sequence_source_record_digest: 'a'.repeat(64),
      sequence_content_digest: 'b'.repeat(64),
      anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1' as const,
      anchor_rule_source: 'test',
      anchor_rule_release: 'test',
      anchor_rule_digest: 'c'.repeat(64),
      reconciliation_status: 'RECONCILED' as const,
    }
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
        representedLength={representedLength}
      />
    )
    const axis = screen.getByLabelText('Length axis') as HTMLSelectElement
    expect(
      (
        within(axis).getByRole('option', {
          name: 'Represented allele length',
        }) as HTMLOptionElement
      ).disabled
    ).toBe(false)
    fireEvent.change(axis, { target: { value: 'absolute' } })
    expect(screen.getByRole('heading', { name: 'Represented allele length (bp)' })).not.toBeNull()
    expect(screen.queryByText('94 bp represented (−6 bp vs REF)')).toBeNull()
    expect(screen.getAllByLabelText(/94 bp represented \(−6 bp vs REF\)/).length).toBeGreaterThan(0)
    const representedRow = screen.getByTitle(`${sourceId}~1`)
    expect(within(representedRow).getAllByRole('cell')[3].textContent).toBe('94')
    expect(within(representedRow).getAllByRole('cell')[4].textContent).toBe('−6')

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
        representedLength={{
          ...representedLength,
          status: 'UNAVAILABLE',
          reason: 'STORED_DELTA_RECONCILIATION_MISMATCH',
          represented_ref_length_bp: null,
          represented_alt_min_length_bp: null,
          represented_alt_max_length_bp: null,
          reconciliation_status: 'MISMATCH',
        }}
      />
    )
    expect(screen.queryByLabelText('Length axis')).toBeNull()
    expect(screen.queryByRole('option', { name: 'Represented allele length' })).toBeNull()
    expect(screen.queryByText(/Represented allele length is disabled/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Change from REF (bp)' })).not.toBeNull()
    expect(screen.queryByText(/bp represented \(−6 bp vs REF\)/)).toBeNull()
    expect(within(screen.getByTitle(`${sourceId}~1`)).getAllByRole('cell')[3].textContent).toBe('—')
  })

  test('uses one stable color per motif and explains LR reference components accessibly', () => {
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
    expect(screen.getByRole('heading', { name: 'LR reference components' })).not.toBeNull()
    fireEvent.click(screen.getByLabelText('About LR reference components'))
    expect(screen.getByText(/callset.*ordered coordinate-and-motif intervals/)).not.toBeNull()
    expect(screen.getByText(/one-based, inclusive/)).not.toBeNull()
    expect(screen.getByText(/Overlapping intervals use separate lanes/)).not.toBeNull()
    expect(screen.getByText(/interval and order are part of their identity/)).not.toBeNull()
    expect(screen.getByText(/do not classify an LR component/)).not.toBeNull()
  })
})
