import React from 'react'
import 'jest-styled-components'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { MotifHighlightedSequence } from '../Haplotypes/TrAlleleStructure'
import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import {
  ExactAlleleIndex,
  histogramDeltaAxisTicks,
  histogramHeightPercent,
  histogramTicks,
  LongReadTrComponentTrack,
  motifColor,
  PURITY_MAX_JITTER,
  PURITY_POINT_CLEARANCE,
  purityDomain,
  purityOverlapOffset,
  purityPointDiameter,
  purityScalePosition,
  purityTickDecimals,
  SelectedExactAlleleDetail,
  stackColorFor,
  WholeRecordAlleleLandscape as WholeRecordAlleleLandscapeWithFilterContract,
  WholeRecordGenotypeLandscape,
  xAxisAlignmentPaddings,
} from './LongReadTrVisualizations'
import {
  AlleleNavigation,
  GenotypePair,
  LongReadTrAllele,
  LongReadTrFilterContract,
  LongReadTrLocus,
  PrimaryMotifMeasurementData,
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

const motifAlleles = [
  { ...makeAllele(1, 8, 100), ref: 'A', alt: 'ACAGCAGCAA' },
  { ...makeAllele(2, 3, 25), ref: 'A', alt: 'ACAA' },
  { ...makeAllele(3, 3, 5), ref: 'A', alt: 'ACAG' },
]
const exactSequenceCardinality = {
  source_alt_identity_count: 3,
  unique_alt_sequence_count: 3,
  all_source_alts_sequence_complete: true,
  status: 'AVAILABLE_EXACT' as const,
  reason: null,
  algorithm_version: 'test',
}
const exactRepresentedLength = {
  status: 'AVAILABLE_EXACT' as const,
  reason: null,
  represented_ref_length_bp: 0,
  represented_alt_min_length_bp: 3,
  represented_alt_max_length_bp: 9,
  source_delta_provenance: 'SEQUENCE_DERIVED' as const,
  sequence_length_provenance: 'test',
  sequence_source_record_digest: 'a'.repeat(64),
  sequence_content_digest: 'b'.repeat(64),
  anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1' as const,
  anchor_rule_source: 'test',
  anchor_rule_release: 'test',
  anchor_rule_digest: 'c'.repeat(64),
  reconciliation_status: 'RECONCILED' as const,
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

// An approved contract whose groups are the given source ancestry and sex keys, each group
// matching its own key alone and combined with every key of the other kind.
const approvedFilterContract = (
  ancestries: string[],
  sexes: string[]
): LongReadTrFilterContract => {
  const group = (key: string, frequencyKeys: string[]) => ({
    id: key,
    label: key,
    kind: 'SOURCE_GROUP' as const,
    source_frequency_keys: frequencyKeys,
    source_metadata_keys: [key],
    available_in_frequency: true,
    available_in_genotype: true,
    shared_available: true,
    unavailable_reason: null,
  })
  return {
    ...unavailableFilterContract,
    status: 'AVAILABLE',
    reason: null,
    ancestry_mapping_status: 'APPROVED_EXACT',
    sex_mapping_status: 'APPROVED_EXACT',
    ancestry_groups: ancestries.map((ancestry) =>
      group(ancestry, [ancestry, ...sexes.map((sex) => `${ancestry}_${sex}`)])
    ),
    sex_groups: sexes.map((sex) =>
      group(sex, [sex, ...ancestries.map((ancestry) => `${ancestry}_${sex}`)])
    ),
    available_color_dimensions: ['ANCESTRY', 'SEX'],
    allele_color_dimensions: ['ANCESTRY', 'SEX'],
    genotype_color_dimensions: ['ANCESTRY', 'SEX'],
    vocabulary_release: 'approved-v1',
    vocabulary_digest: 'd'.repeat(64),
  }
}

// Production always passes the API's filter contract. A test that is not about filtering gets one
// that admits no filters.
const WholeRecordAlleleLandscape = (
  props: Omit<
    React.ComponentProps<typeof WholeRecordAlleleLandscapeWithFilterContract>,
    'filterContract'
  > & { filterContract?: LongReadTrFilterContract }
) => (
  <WholeRecordAlleleLandscapeWithFilterContract
    filterContract={unavailableFilterContract}
    {...props}
  />
)

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
      "No sequence details shown. Click a 'Details' button in one of the rows above to view the allele's sequence and other information."
    )
    expect(emptySelection).not.toHaveStyleRule('min-height')
    expect(emptySelection).toHaveStyleRule('padding', '0.65em 0.8em')

    rendered.rerender(
      <ExactAlleleIndex alleles={simpleAlleles} motifs={['T']} navigation={navigation} />
    )
    expect(screen.getAllByText('Unavailable')).toHaveLength(3)
    // The sequences are there, so the page says why their previews are not.
    expect(screen.getByRole('status').textContent).toBe(
      'Motif previews are unavailable because the REF and ALT sequences were not validated to share their leading VCF padding base.'
    )

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
      'Source ID',
      'Allele Sequence',
      'Allele Size (bp)',
      'Allele Size vs REF (bp)',
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
    ).toEqual([`${sourceId}~1`, 'Unavailable', '94', '−6', '0.99', '100', '0.5000', 'Details'])
    expect(within(firstRow).queryByText(/Sequence 1|Source ALT 1 of|bp vs REF/)).toBeNull()

    const details = within(firstRow).getByRole('link', { name: 'Details for Sequence 1' })
    expect(details.textContent).toBe('Details')
    expect(details.getAttribute('aria-current')).toBe('page')
    expect(details).toHaveStyleRule('height', 'calc(2em + 2px)')
    expect(details).toHaveStyleRule('border-radius', '0.5em')
    expect(details).toHaveStyleRule('background', '#f8f9fa')

    const representedLengthSort = within(table).getByRole('button', {
      name: 'Allele Size (bp)',
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
        filterContract={approvedFilterContract(['nfe', 'afr'], ['XY', 'XX'])}
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

  test('puts linear count ticks at round numbers below the largest count', () => {
    expect(histogramTicks(372, 'linear')).toEqual([0, 100, 200, 300])
    expect(histogramTicks(265, 'linear')).toEqual([0, 50, 100, 150, 200, 250])
    expect(histogramTicks(400, 'linear')).toEqual([0, 100, 200, 300, 400])
    expect(histogramTicks(7, 'linear')).toEqual([0, 2, 4, 6])
    expect(histogramTicks(1, 'linear')).toEqual([0, 1])
    expect(histogramTicks(0, 'linear')).toEqual([0, 1])
    expect(histogramTicks(5000, 'linear-truncated-50')).toEqual([0, 10, 20, 30, 40, 50])
  })

  test('keeps signed delta ticks adaptive while retaining endpoints and zero', () => {
    const deltas = Array.from({ length: 41 }, (_, index) => index - 20)
    const ticks = histogramDeltaAxisTicks(deltas, 14, 2)
    expect(ticks.map((tick) => tick.delta)).toEqual(expect.arrayContaining([-20, 0, 20]))
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

  test('gives REF copies an orange bar of their own when no ALT allele has the REF length', () => {
    const altAllelesOffReferenceLength = [alleles[0], alleles[2]]
    render(
      <WholeRecordAlleleLandscape
        landscape={{
          ...alleleLandscape,
          non_reference_called_alleles: 105,
          reference_called_alleles: 95,
          exact_alt_count: 2,
          bins: (alleleLandscape.bins || []).filter((bin) => bin.delta !== 0),
        }}
        alleles={altAllelesOffReferenceLength}
        navigation={navigation}
      />
    )

    const referenceBar = screen.getByRole('button', {
      name: '0 bp vs REF; 95 REF allele copies in this view',
    }) as HTMLButtonElement
    expect(referenceBar.disabled).toBe(true)
    expect(window.getComputedStyle(referenceBar).backgroundColor).toBe('rgb(230, 159, 0)')
    expect(referenceBar.textContent).toBe('REF95')
    // Every bar is labeled with its height: the number of alleles in it.
    expect(
      within(screen.getByTestId('whole-record-delta-histogram'))
        .getAllByRole('button')
        .map((bar) => bar.textContent)
        .sort()
    ).toEqual(['100', '5', 'REF95'])
    expect(
      screen
        .getByTestId('whole-record-delta-histogram')
        .closest('[data-bin-count]')
        ?.getAttribute('data-bin-count')
    ).toBe('3')
    // 100 + 5 ALT copies plus the 95 REF copies.
    expect(screen.getByText(/^Sizes of 200 alleles/)).not.toBeNull()
  })

  test('says why purity is missing for a cohort without per-person calls', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={{ ...alleleLandscape, purity_unavailable_reason: 'CARRIER_CALLS_NOT_AVAILABLE' }}
        alleles={alleles}
        navigation={navigation}
      />
    )

    expect(
      screen.getByText('Purity unavailable: the per-person calls for this cohort are not loaded.')
    ).not.toBeNull()
  })

  test('says why AoU purity is missing at a record with a single ALT allele', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={{ ...alleleLandscape, purity_unavailable_reason: 'NO_ALIGNED_SOURCE_AP_ALLELE' }}
        alleles={alleles}
        navigation={navigation}
      />
    )

    expect(
      screen.getByText(
        'Purity unavailable: the source VCF reports purity only for records with more than one ALT allele.'
      )
    ).not.toBeNull()
  })

  test('notes a table that lists only the most common ALTs, and counts unlisted ones a bar selects', () => {
    // A fourth ALT, at +12 bp with ~3, is counted by the plots but not listed in the table.
    const unlistedAlleleId = `${sourceId}~4`
    render(
      <WholeRecordAlleleLandscape
        landscape={{
          ...alleleLandscape,
          called_alleles: 202,
          non_reference_called_alleles: 132,
          exact_alt_count: 4,
          bins: (alleleLandscape.bins || []).map((bin) =>
            bin.delta === 12
              ? {
                  ...bin,
                  called_alleles: 7,
                  exact_alt_count: 2,
                  allele_ids: [...bin.allele_ids, unlistedAlleleId],
                }
              : bin
          ),
          purity_points: [
            ...alleles.map((allele) => ({
              allele_id: allele.variant_id,
              delta: allele.length as number,
              motif_purity: 0.99,
              called_alleles: allele.freq.all.ac,
            })),
            { allele_id: unlistedAlleleId, delta: 12, motif_purity: 0.9, called_alleles: 2 },
          ],
          purity_available: true,
          purity_unavailable_reason: null,
        }}
        alleles={alleles}
        navigation={navigation}
      />
    )

    // The unlisted ALT's dot is drawn too: 100 + 25 + 5 + 2 copies.
    expect(screen.getByText('Purity of 132 alleles')).not.toBeNull()
    const note =
      'The table lists the 3 ALT alleles with the highest allele counts (AC), out of 4. The plots include all of them.'
    expect(screen.getByText(note)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /\+12 bp vs REF; 7 called non-reference/ }))
    expect(
      screen.getByRole('heading', { name: '2 of 4 non-reference alleles selected' })
    ).not.toBeNull()
    expect(screen.getByText(`${note} 1 of the selected ALT alleles are not listed.`)).not.toBeNull()
    expect(
      screen.getByRole('table', { name: 'Source ALT allele index' }).getAttribute('aria-rowcount')
    ).toBe('2')
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
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
    expect(exactIndex.getAttribute('aria-rowcount')).toBe('4')
    expect(screen.queryByRole('table', { name: /Exact ALTs at/ })).toBeNull()

    const histogram = screen.getByLabelText('Change from REF (bp) histogram')
    // Bar label headroom sits above the bar area, not inside it, so bar heights match the y ticks.
    expect(window.getComputedStyle(histogram).paddingTop).toBe('')
    // The headroom fits one line of the bar labels: 9px (the minimum size) at 1.2 line height + 6px.
    expect(window.getComputedStyle(histogram.parentElement!).paddingTop).toBe('17px')
    // A light grid line at each y tick above 0 (the tallest bar holds 100 alleles, so ticks are
    // every 20), placed where a bar of that height ends.
    const gridLines = within(histogram).getAllByTestId('histogram-grid-line')
    expect(gridLines.map((line) => line.style.bottom)).toEqual(['20%', '40%', '60%', '80%', '100%'])
    const deltaAxis = screen.getByTestId('whole-record-delta-axis')
    expect(within(deltaAxis).getByLabelText('-6 bp tick').textContent).toBe('−6')
    expect(within(deltaAxis).getByLabelText('0 bp tick').textContent).toBe('0')
    expect(within(deltaAxis).getByLabelText('12 bp tick').textContent).toBe('+12')
    expect(deltaAxis.getAttribute('aria-label')).toBe('Change from REF (bp) axis')
    expect(deltaAxis.getAttribute('aria-label')).toHaveLength(25)
    const negativeBar = screen.getByRole('button', {
      name: /−6 bp vs REF; 100 called non-reference allele copies/,
    })
    // ALT allele size bars are blue; the 70 REF copies stack in orange on the 0 bp bar.
    expect(window.getComputedStyle(negativeBar).backgroundColor).toBe('rgb(0, 114, 178)')
    expect(histogram.closest('[data-bin-count]')?.getAttribute('data-bin-count')).toBe('3')
    // One slot per size that someone has, so only the 3 sizes get a bar and a tick. Few bars keep
    // the widest bar width rather than growing to fill the plot.
    expect(negativeBar.getAttribute('data-bar-width')).toBe('45')
    expect(within(deltaAxis).getAllByTestId('whole-record-delta-axis-tick')).toHaveLength(3)
    expect(within(histogram).getAllByRole('button')).toHaveLength(3)
    // No minimum width may widen a bar past the width its x tick and purity dot are placed for.
    expect(window.getComputedStyle(negativeBar).minWidth).toBe('')
    const zeroBar = screen.getByRole('button', {
      name: /0 bp vs REF; 70 REF allele copies; 25 called non-reference allele copies/,
    })
    expect(within(zeroBar).getByTestId('reference-allele-segment').style.background).toBe(
      'rgb(230, 159, 0)'
    )
    expect(screen.getByLabelText('Allele length histogram colors').textContent).toBe(
      'REF allele ALT alleles'
    )

    // A selected bar turns dark navy so it never reads as the orange REF allele.
    fireEvent.click(negativeBar)
    expect(window.getComputedStyle(negativeBar).backgroundColor).toBe('rgb(0, 63, 99)')
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()
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
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()

    fireEvent.click(
      screen.getByRole('button', {
        name: /0 bp vs REF; 70 REF allele copies; 25 called non-reference allele copies/,
      })
    )
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()
    const exactLink = within(exactIndex).getByRole('link', { name: 'Details for Sequence 2' })
    expect(exactLink.getAttribute('href')).toBe(`?allele=${alleles[1].variant_id}`)
    fireEvent.click(exactLink)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(alleles[1].variant_id)

    fireEvent.click(screen.getByRole('button', { name: 'Show all ALT alleles' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Allele Details' }))
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
      screen.queryByText(
        /Bar height: called non-reference allele copies. Number above: source ALT identities./
      )
    ).toBeNull()
  })

  test('selects and replaces accessible histogram ranges in both directions, then clears with Escape', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={alleles}
        navigation={navigation}
      />
    )
    const negative = screen.getByRole('button', { name: /−6 bp vs REF; 100 called/ })
    const zero = screen.getByRole('button', {
      name: /0 bp vs REF; 70 REF allele copies; 25 called/,
    })
    const positive = screen.getByRole('button', { name: /\+12 bp vs REF; 5 called/ })

    // Keyboard keys go to whatever has focus, so a selection must leave focus on the bar for
    // Shift+Arrow and Escape to keep working.
    negative.focus()
    fireEvent.click(negative)
    expect(document.activeElement).toBe(negative)
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight', shiftKey: true })
    expect(negative.getAttribute('aria-pressed')).toBe('true')
    expect(zero.getAttribute('aria-pressed')).toBe('true')
    expect(positive.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getAllByTestId('total-length-selection-boundary')).toHaveLength(2)
    // The heading announces the new count as a live region instead of taking focus.
    expect(
      screen.getByRole('heading', {
        name: '2 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()
    expect(document.activeElement).toBe(negative)

    positive.focus()
    fireEvent.click(positive)
    expect(negative.getAttribute('aria-pressed')).toBe('false')
    expect(positive.getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()

    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft', shiftKey: true })
    expect(zero.getAttribute('aria-pressed')).toBe('true')
    expect(positive.getAttribute('aria-pressed')).toBe('true')
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
    expect(document.activeElement).toBe(positive)
  })

  test('renders repeat-count and genotype-length cards together with a dynamic plot count', () => {
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: '__REFERENCE__',
      called_samples: 1,
      called_alleles: 2,
      cells: [
        {
          shorter_delta: -6,
          longer_delta: 0,
          people: 1,
          pairs: [duplicatePairs[0]],
        },
      ],
    }
    const repeatCountPlots: LongReadTrLocus['repeat_count_plots'] = {
      status: 'AVAILABLE_EXACT',
      reason_code: null,
      repeat_unit: 'CAG',
      max_repunits: 11,
      interaction: {
        interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES',
        reason: 'Aggregate histogram source has no exact contributor identities.',
      },
      allele_size_distribution: [
        {
          ancestry_group: 'afr',
          sex: 'XX',
          repunit: 'CAG',
          distribution: [{ repunit_count: 10, frequency: 2, colorByValue: null }],
        },
      ],
      genotype_distribution: [
        {
          ancestry_group: 'afr',
          sex: 'XX',
          short_allele_repunit: 'CAG',
          long_allele_repunit: 'CAG',
          distribution: [
            {
              short_allele_repunit_count: 10,
              long_allele_repunit_count: 11,
              frequency: 1,
            },
          ],
        },
      ],
    }

    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        repeatCountPlots={repeatCountPlots}
        alleles={alleles}
        navigation={navigation}
      />
    )

    const grid = screen.getByTestId('whole-record-allele-plot-grid')
    expect(grid.getAttribute('data-plot-count')).toBe('3')
    expect(grid.querySelectorAll(':scope > [data-plot-card]')).toHaveLength(3)
    expect(within(grid).getByTestId('genotype-length-card')).not.toBeNull()
    const alleleLengthAxis = screen.getByLabelText('Allele length distribution allele size measure')
    alleleLengthAxis.focus()
    fireEvent.change(alleleLengthAxis, { target: { value: 'repeats-absolute' } })
    expect(screen.getByLabelText('Allele length distribution allele size measure')).toBe(
      alleleLengthAxis
    )
    expect(document.activeElement).toBe(alleleLengthAxis)
    // Each plot has its own allele size measure menu, so the genotype plot stays in bp until its own
    // menu changes.
    expect(
      within(within(grid).getByTestId('genotype-length-card')).queryByText(
        'Long Allele (longest pure run)'
      )
    ).toBeNull()
    fireEvent.change(screen.getByLabelText('Genotype length distribution allele size measure'), {
      target: { value: 'repeats-absolute' },
    })
    // The repeat measure draws the precomputed repeat-count histograms, which give each allele's
    // longest pure run, with the same plots as the bp measure. This fixture's histogram holds
    // fewer alleles at the REF's longest pure run than there are REF alleles, so the REF size is
    // unknown and each size reads as its own longest pure run, not as a change from REF.
    expect(
      within(alleleLengthAxis).getByRole('option', {
        name: 'ALT allele longest pure run (repeats)',
      })
    ).not.toBeNull()
    expect(within(grid).queryByTestId('allele-repeat-count-card')).toBeNull()
    expect(within(grid).queryByTestId('genotype-repeat-count-card')).toBeNull()
    // Screen readers hear the histogram's unit, longest pure runs, not base pairs.
    expect(screen.getByLabelText('Longest pure run (repeats) histogram')).not.toBeNull()
    expect(screen.getByLabelText('Longest pure run (repeats) axis')).not.toBeNull()
    const alleleCard = within(grid).getByRole('heading', { name: 'Allele length distribution' })
      .parentElement as HTMLElement
    expect(within(alleleCard).getByText('Allele (longest pure run)')).not.toBeNull()
    expect(within(alleleCard).getByText('Sizes of 2 alleles')).not.toBeNull()
    const repeatBar = within(screen.getByTestId('whole-record-delta-histogram')).getByRole(
      'button',
      { name: '10 copies in longest pure run; 2 alleles in this view' }
    ) as HTMLButtonElement
    expect(repeatBar.disabled).toBe(true)
    expect(repeatBar.textContent).toBe('2')
    const genotypeCard = within(grid).getByTestId('genotype-length-card')
    expect(within(genotypeCard).getByText('Long Allele (longest pure run)')).not.toBeNull()
    expect(within(genotypeCard).getByText('Short Allele (longest pure run)')).not.toBeNull()
    // The squares carry no allele ids, so they show their counts on hover but are not buttons.
    expect(within(genotypeCard).queryByTestId('genotype-length-cell-target')).toBeNull()
    expect(within(genotypeCard).getByTestId('genotype-length-cell-tooltip').textContent).toBe(
      '11 copies in longest pure run × 10 copies in longest pure run: 1 person'
    )
    // Without a known REF size there is no change-from-REF repeat measure.
    expect(screen.queryByRole('option', { name: /ALT − REF allele longest pure run/ })).toBeNull()
    expect(grid.querySelectorAll(':scope > [data-plot-card]')).toHaveLength(3)
  })

  test('admits exact-motif genotype choice only for source-complete paired product data', () => {
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: '__REFERENCE__',
      called_samples: 1,
      called_alleles: 2,
      cells: [
        {
          shorter_delta: -6,
          longer_delta: 0,
          people: 1,
          pairs: [duplicatePairs[0]],
        },
      ],
    }
    const primaryMotifMeasurement: PrimaryMotifMeasurementData = {
      status: 'AVAILABLE',
      reason_code: null,
      motif: 'CAG',
      biological_role: 'reviewed primary repeat',
      metric: 'WHOLE_RECORD_EXACT_PRIMARY_MOTIF_UNITS_V1',
      scope: 'WHOLE_REPRESENTED_ALLELE',
      unit: 'EXACT_PRIMARY_MOTIF_UNITS',
      called_alleles: 2,
      reference_alleles: 1,
      alternate_alleles: 1,
      alternate_identities_checked: 1,
      bins: [{ exact_units: 10, allele_copies: 2 }],
      genotype: {
        status: 'AVAILABLE',
        reason_code: null,
        called_diploid_people: 1,
        no_call_people: 0,
        cells: [{ shorter_exact_units: 10, longer_exact_units: 11, people: 1 }],
      },
      provenance: null,
    }
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        primaryMotifMeasurement={primaryMotifMeasurement}
        alleles={alleles}
        navigation={navigation}
      />
    )

    const genotypeLengthAxis = screen.getByLabelText(
      'Genotype length distribution allele size measure'
    ) as HTMLSelectElement
    expect(genotypeLengthAxis.value).toBe('bp-delta')
    fireEvent.change(genotypeLengthAxis, { target: { value: 'repeats-absolute' } })
    expect(screen.getByTestId('primary-motif-genotype-cells')).not.toBeNull()
    expect(screen.queryByTestId('genotype-length-card')).toBeNull()

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        primaryMotifMeasurement={{
          ...primaryMotifMeasurement,
          genotype: { ...primaryMotifMeasurement.genotype, status: 'UNAVAILABLE' },
        }}
        alleles={alleles}
        navigation={navigation}
      />
    )
    // The genotype plot no longer admits a repeat-unit product, so its own menu falls back to
    // the bp measure and its length card.
    expect(screen.queryByTestId('primary-motif-genotype-cells')).toBeNull()
    expect(screen.getByTestId('genotype-length-card')).not.toBeNull()
  })

  test('renders an identity-backed motif selector, defaults to the admitted primary motif, and filters without navigation', () => {
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        alleles={motifAlleles}
        motifs={['CAG', 'CAA']}
        primaryMotif="CAA"
        presentation={{ locus_type: 'ISOLATED_REPEAT' }}
        exactAltCountComplete
        sequenceCardinality={exactSequenceCardinality}
        representedLength={{ ...exactRepresentedLength, represented_ref_length_bp: 6 }}
        navigation={navigation}
      />
    )

    const grid = screen.getByTestId('whole-record-allele-plot-grid')
    expect(grid.getAttribute('data-plot-count')).toBe('2')
    expect(grid.querySelectorAll(':scope > [data-plot-card]')).toHaveLength(2)
    expect(within(grid).getByTestId('whole-record-delta-histogram')).not.toBeNull()
    expect(within(grid).queryByTestId('motif-occurrence-card')).toBeNull()
    const lengthAxis = screen.getByLabelText(
      'Allele length distribution allele size measure'
    ) as HTMLSelectElement
    expect(lengthAxis.value).toBe('bp-absolute')
    // The motif occurrence counts have no change-from-REF form, so only the absolute repeat
    // measure is offered for them.
    expect(Array.from(lengthAxis.options).map((option) => option.value)).toEqual([
      'bp-absolute',
      'repeats-absolute',
      'bp-delta',
    ])
    fireEvent.change(lengthAxis, { target: { value: 'repeats-absolute' } })
    expect(
      (screen.getByLabelText('Allele length distribution allele size measure') as HTMLSelectElement)
        .value
    ).toBe('repeats-absolute')
    expect(within(grid).queryByTestId('whole-record-delta-histogram')).toBeNull()
    const card = within(grid).getByTestId('motif-occurrence-card')
    expect(
      within(card).getByRole('heading', {
        name: 'Allele exact-motif distribution',
      })
    ).not.toBeNull()
    expect(within(card).queryByText(/Whole represented source ALT alleles only/)).toBeNull()
    expect(
      within(card).queryByText(/not component repeat count, genotype, or a clinical measure/)
    ).toBeNull()
    const selector = within(card).getByLabelText(
      'Motif for source ALT occurrence distribution'
    ) as HTMLSelectElement
    expect(selector.value).toBe('1')
    expect(within(card).queryByText(/pathogenic/i)).toBeNull()

    const selectedBin = within(card).getByRole('button', {
      name: /CAA; longest pure run of 1 copy in each whole represented source ALT; 125 called source ALT copies.*2 distinct ALT alleles; filter/,
    })
    fireEvent.click(selectedBin)
    expect(selectedBin.getAttribute('aria-pressed')).toBe('true')
    expect(within(card).getAllByTestId('motif-occurrence-selection-boundary')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {
        name: '2 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()
    expect(navigation.onSelectAllele).not.toHaveBeenCalled()
    expect(
      within(screen.getByRole('table', { name: 'Source ALT allele index' })).getAllByRole('row')
    ).toHaveLength(3)

    const zeroBin = within(card).getByRole('button', {
      name: /CAA; longest pure run of 0 copies in each whole represented source ALT/,
    })
    fireEvent.keyDown(selectedBin, { key: 'ArrowLeft', shiftKey: true })
    expect(selectedBin.getAttribute('aria-pressed')).toBe('true')
    expect(zeroBin.getAttribute('aria-pressed')).toBe('true')
    expect(within(card).getAllByTestId('motif-occurrence-selection-boundary')).toHaveLength(2)
    expect(
      screen.getByRole('heading', {
        name: '3 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()

    fireEvent.keyDown(selectedBin, { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
    fireEvent.change(selector, { target: { value: '0' } })
    expect(selector.value).toBe('0')
    fireEvent.click(
      within(card).getByRole('button', {
        name: /CAG; longest pure run of 1 copy in each whole represented source ALT/,
      })
    )
    fireEvent.change(screen.getByLabelText('Allele length distribution allele size measure'), {
      target: { value: 'bp-delta' },
    })
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
    expect(within(grid).queryByTestId('motif-occurrence-card')).toBeNull()
    expect(within(grid).getByTestId('whole-record-delta-histogram')).not.toBeNull()
    fireEvent.change(screen.getByLabelText('Allele length distribution allele size measure'), {
      target: { value: 'repeats-absolute' },
    })
    expect(screen.getByLabelText('Motif for source ALT occurrence distribution')).toHaveValue('0')
  })

  test('falls back to the first motif, follows active-slice AC, and omits the whole plot on one missing ALT', () => {
    const slicedAlleles = motifAlleles.map((allele, index) => ({
      ...allele,
      freq: {
        ...allele.freq,
        populations: [{ id: 'afr', ac: index === 1 ? 2 : 0, an: 20, af: index === 1 ? 0.1 : 0 }],
      },
    }))
    const stratifiedLandscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      bins: (alleleLandscape.bins || []).map((bin) => ({
        ...bin,
        stacks: [{ ancestry_group: 'afr', sex: null, called_alleles: 2 }],
      })),
    }
    const filterContract = approvedFilterContract(['afr'], [])
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        alleles={slicedAlleles}
        motifs={['CAG', 'CAA']}
        primaryMotif="GCC"
        exactAltCountComplete
        sequenceCardinality={exactSequenceCardinality}
        representedLength={exactRepresentedLength}
        navigation={navigation}
        filterContract={filterContract}
      />
    )
    fireEvent.change(screen.getByLabelText('Allele length distribution allele size measure'), {
      target: { value: 'repeats-absolute' },
    })
    expect(
      screen.getByRole('group', {
        name: 'API-admitted ancestry and sex filters for visible allelic-landscape plots',
      })
    ).not.toBeNull()
    expect(screen.getByText('Filter visible allelic-landscape plots:')).not.toBeNull()
    const selector = screen.getByLabelText(
      'Motif for source ALT occurrence distribution'
    ) as HTMLSelectElement
    expect(selector.value).toBe('0')
    fireEvent.change(screen.getByLabelText('Genetic ancestry group'), { target: { value: 'afr' } })
    expect(
      screen.getByRole('button', {
        name: /CAG; longest pure run of 0 copies.*2 called source ALT copies.*1 distinct ALT allele; filter/,
      })
    ).not.toBeNull()
    expect(screen.queryByRole('button', { name: /CAG; longest pure run of 1 copy/ })).toBeNull()
    fireEvent.change(screen.getByLabelText('Allele length distribution allele size measure'), {
      target: { value: 'bp-absolute' },
    })
    expect(screen.getByLabelText('Genetic ancestry group')).toHaveValue('afr')
    fireEvent.change(screen.getByLabelText('Allele length distribution allele size measure'), {
      target: { value: 'repeats-absolute' },
    })
    expect(screen.getByLabelText('Motif for source ALT occurrence distribution')).toHaveValue('0')
    fireEvent.click(
      screen.getByRole('button', {
        name: /CAG; longest pure run of 0 copies.*2 called source ALT copies.*1 distinct ALT allele; filter/,
      })
    )
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        alleles={slicedAlleles.map((allele, index) =>
          index === 2 ? { ...allele, alt: null } : allele
        )}
        motifs={['CAG', 'CAA']}
        primaryMotif="GCC"
        exactAltCountComplete
        sequenceCardinality={exactSequenceCardinality}
        representedLength={exactRepresentedLength}
        navigation={navigation}
        filterContract={filterContract}
      />
    )
    expect(screen.queryByTestId('motif-occurrence-card')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
    expect(
      screen.getByTestId('whole-record-allele-plot-grid').getAttribute('data-plot-count')
    ).toBe('2')
  })

  test('separates unmatched bases from the motif copies on both sides', () => {
    render(
      <SelectedExactAlleleDetail
        allele={{
          ...alleles[0],
          ref: 'A',
          alt: 'ACGCGCCGC',
          motif_purity_source: null,
          decomposition_status: 'UNAVAILABLE_NO_DECOMPOSITION',
          decomposition_reason: 'No admitted source decomposition is available',
          short_read_match_id: null,
          short_read_match_type: null,
          short_read_match_source: null,
          source_release: 'test',
          source_run_id: 'run-test',
        }}
        motifs={['CGC']}
        representedLength={{
          status: 'AVAILABLE_EXACT',
          reason: null,
          represented_ref_length_bp: 0,
          represented_alt_min_length_bp: 8,
          represented_alt_max_length_bp: 8,
          source_delta_provenance: 'INFO_ALLELE_LENGTH',
          sequence_length_provenance: 'test',
          sequence_source_record_digest: 'a'.repeat(64),
          sequence_content_digest: 'b'.repeat(64),
          anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1',
          anchor_rule_source: 'test',
          anchor_rule_release: 'test',
          anchor_rule_digest: 'c'.repeat(64),
          reconciliation_status: 'RECONCILED',
        }}
      />
    )

    // CGC, then the unmatched GC, then CGC: a gap before the GC and another after it.
    const preview = screen.getByLabelText(/Exact stored-motif string preview for Sequence 1/)
    expect(preview.textContent).toBe('CGCGCCGC')
    const separators = Array.from(
      preview.querySelectorAll<HTMLElement>('[data-motif-visual-separator="true"]')
    )
    expect(separators.map((separator) => separator.textContent)).toEqual(['G', 'C'])
    expect(separators.every((separator) => separator.style.marginLeft === '2px')).toBe(true)
  })

  test('visually separates adjacent motif matches without changing sequence bytes', () => {
    render(
      <SelectedExactAlleleDetail
        allele={{
          ...alleles[0],
          ref: 'A',
          alt: 'ACAGCAGCAA',
          motif_purity_source: null,
          decomposition_status: 'UNAVAILABLE_NO_DECOMPOSITION',
          decomposition_reason: 'No admitted source decomposition is available',
          short_read_match_id: null,
          short_read_match_type: null,
          short_read_match_source: null,
          source_release: 'test',
          source_run_id: 'run-test',
        }}
        motifs={['CAG', 'CAA']}
        representedLength={{
          status: 'AVAILABLE_EXACT',
          reason: null,
          represented_ref_length_bp: 9,
          represented_alt_min_length_bp: 9,
          represented_alt_max_length_bp: 9,
          source_delta_provenance: 'INFO_ALLELE_LENGTH',
          sequence_length_provenance: 'test',
          sequence_source_record_digest: 'a'.repeat(64),
          sequence_content_digest: 'b'.repeat(64),
          anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1',
          anchor_rule_source: 'test',
          anchor_rule_release: 'test',
          anchor_rule_digest: 'c'.repeat(64),
          reconciliation_status: 'RECONCILED',
        }}
      />
    )

    expect(screen.getByRole('heading', { name: 'chr4-test~1', exact: true })).not.toBeNull()
    expect(screen.getByText('ALT allele sequence', { exact: true })).not.toBeNull()
    // Frequency and purity are in the allele table, and phyloP belongs to the whole record, so
    // the panel has no table of them.
    expect(screen.queryByRole('region', { name: 'Selected exact ALT summary table' })).toBeNull()
    expect(screen.queryByText(/Allele frequency|Allele sequence purity|phyloP/)).toBeNull()
    // The sequence is shown once, as motif tiles without the VCF padding base.
    expect(screen.queryByText('Stored-motif matches', { exact: true })).toBeNull()
    expect(screen.queryByLabelText('Exact copyable source sequence for Sequence 1')).toBeNull()
    const preview = screen.getByLabelText(/Exact stored-motif string preview for Sequence 1/)
    expect(preview.textContent).toBe('CAGCAGCAA')
    const separators = preview.querySelectorAll('[data-motif-visual-separator="true"]')
    expect(separators).toHaveLength(2)
    expect(
      Array.from(separators).every(
        (separator) => window.getComputedStyle(separator).marginLeft === '2px'
      )
    ).toBe(true)
    // Each motif copy is one block, so a line break never splits it unless it is wider than the box.
    const motifCopies = Array.from(
      preview.querySelectorAll<HTMLElement>('[data-sequence-role="motif"]')
    )
    expect(motifCopies).toHaveLength(3)
    expect(
      motifCopies.every(
        (copy) => copy.style.display === 'inline-block' && copy.style.maxWidth === '100%'
      )
    ).toBe(true)
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
    expect(
      screen.getByRole('heading', { name: '2 of 4 non-reference alleles selected' })
    ).not.toBeNull()
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

    const scatter = screen.getByRole('group', { name: /3 distinct ALT alleles plotted/ })
    expect(scatter.getAttribute('data-purity-domain')).toBe('0.990000:1.000000')
    const purityCard = scatter.closest('[data-plot-card="motif-purity"]') as HTMLElement
    const tickLabels = within(purityCard)
      .getAllByTestId('purity-axis-tick')
      .map((tick) => tick.textContent)
    expect(new Set(tickLabels).size).toBe(3)
    // No trailing zeros that every tick shares.
    expect(tickLabels).toEqual(['0.990', '0.995', '1.000'])
    // The x axis reads like the allele length histogram's: bare tick values and one title.
    expect(
      within(purityCard)
        .getAllByTestId('purity-x-axis-tick')
        .every((tick) => /^[−+-]?\d+$/.test(tick.textContent || ''))
    ).toBe(true)
    expect(within(purityCard).getByText('Allele (bp minus REF)')).not.toBeNull()
    expect(within(purityCard).queryByText(/ bp$/)).toBeNull()

    const points = within(scatter).getAllByRole('button', {
      name: /Filter the source-ALT index to Sequence/,
    })
    expect(points).toHaveLength(3)
    expect(
      points.slice(0, 2).map((candidate) => candidate.getAttribute('data-overlap-offset'))
    ).toEqual(['-12', '12'])
    expect(screen.queryByText(/Overlapping points are separated/)).toBeNull()
    const point = within(scatter).getByRole('button', {
      name: /Filter the source-ALT index to Sequence 3; \+12 bp vs REF; source-reported motif purity 1.0000/,
    })
    expect(point.getAttribute('aria-pressed')).toBe('false')
    // The click area is the visible dot, so it never covers a neighboring dot.
    const diameter = point.getAttribute('data-point-diameter')
    expect(point).toHaveStyleRule('width', `${diameter}px`)
    expect(point).toHaveStyleRule('height', `${diameter}px`)
    // The ALT dots use the allele length histogram's ALT bar blue.
    expect(window.getComputedStyle(point.firstElementChild as Element).backgroundColor).toBe(
      'rgb(0, 114, 178)'
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
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
    ).not.toBeNull()
    fireEvent.keyDown(point, { key: 'ArrowLeft', shiftKey: true })
    expect(points.every((candidate) => candidate.getAttribute('aria-pressed') === 'true')).toBe(
      true
    )
    expect(
      screen.getByRole('heading', {
        name: '3 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()
    fireEvent.keyDown(point, { key: 'Escape' })
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
  })

  test('adds the REF allele to the purity plot as a dot that does not filter the index', () => {
    const landscape: WholeRecordAlleleLandscapeData = {
      ...alleleLandscape,
      purity_available: true,
      purity_unavailable_reason: null,
      reference_purity: 0.98,
      purity_points: alleles.map((allele) => ({
        allele_id: allele.variant_id,
        delta: allele.length as number,
        motif_purity: 1,
        called_alleles: allele.freq.all.ac,
      })),
    }
    render(
      <WholeRecordAlleleLandscape landscape={landscape} alleles={alleles} navigation={navigation} />
    )

    const purityCard = screen
      .getByRole('heading', { name: 'Repeat sequence purity' })
      .closest('[data-plot-card="motif-purity"]') as HTMLElement
    // The REF's 70 copies join the ALT dots, so the dots account for every allele.
    const referencePoint = within(purityCard).getByTestId('purity-reference-point')
    expect(referencePoint.getAttribute('aria-label')).toBe(
      'REF allele: purity 0.9800, 70 called allele copies'
    )
    expect(referencePoint.tagName).toBe('SPAN')
    expect(within(purityCard).getByText('REF allele')).not.toBeNull()
    // The subtitle counts every allele a dot stands for, REF included.
    const altCopies = alleles.reduce((sum, allele) => sum + allele.freq.all.ac, 0)
    expect(within(purityCard).getByText(`Purity of ${altCopies + 70} alleles`)).not.toBeNull()
    expect(
      within(purityCard).getAllByRole('button', { name: /Filter the source-ALT index/ })
    ).toHaveLength(alleles.length)
  })

  test('pads the higher plots in each grid row down to the lowest x axis in that row', () => {
    expect(
      xAxisAlignmentPaddings([
        { cardTop: 100, xAxisY: 340 },
        { cardTop: 100, xAxisY: 360 },
        { cardTop: 100, xAxisY: 250 },
        { cardTop: 700, xAxisY: 900 },
      ])
    ).toEqual([20, 0, 110, 0])
  })

  test('drops trailing zeros that every purity tick shares', () => {
    expect(purityTickDecimals([0.99, 0.995, 1], 0.99, 1)).toBe(3)
    expect(purityTickDecimals([0.9, 0.95, 1], 0.9, 1)).toBe(2)
    expect(purityTickDecimals([0.8123, 0.9061, 1], 0.8123, 1)).toBe(3)
  })

  test('keeps boundary AC marks inside short plots and bounds coincidence jitter', () => {
    const shortHeight = 190
    const toPixels = (position: ReturnType<typeof purityScalePosition>, extent: number) =>
      (position.percent / 100) * extent + position.pixelOffset
    const minimumPurity = toPixels(
      purityScalePosition(0.97, 0.97, 1, PURITY_POINT_CLEARANCE),
      shortHeight
    )
    const maximumPurity = toPixels(
      purityScalePosition(1, 0.97, 1, PURITY_POINT_CLEARANCE),
      shortHeight
    )
    const jitterOffsets = Array.from({ length: 6 }, (_, index) => purityOverlapOffset(index, 6))

    expect(minimumPurity).toBe(PURITY_POINT_CLEARANCE)
    expect(maximumPurity).toBe(shortHeight - PURITY_POINT_CLEARANCE)
    expect(new Set(jitterOffsets).size).toBe(6)
    expect(Math.max(...jitterOffsets.map(Math.abs))).toBe(PURITY_MAX_JITTER)
    const largestAcRadius = purityPointDiameter(100, 1, 100) / 2
    expect(largestAcRadius).toBe(13)
    expect(largestAcRadius).toBeLessThan(PURITY_POINT_CLEARANCE)
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
    // The REF guide lines cross at the center of the REF/REF square, whose click target is
    // exactly the square.
    const [verticalReferenceLine, horizontalReferenceLine] = screen.getAllByTestId(
      'genotype-length-reference-line'
    )
    expect(Number(verticalReferenceLine.getAttribute('x1'))).toBeCloseTo(
      Number(cell.getAttribute('x')) + Number(cell.getAttribute('width')) / 2
    )
    expect(Number(horizontalReferenceLine.getAttribute('y1'))).toBeCloseTo(
      Number(cell.getAttribute('y')) + Number(cell.getAttribute('height')) / 2
    )
    const squareFill = cell.parentElement!.querySelector('rect[aria-hidden="true"]')!
    expect(Number(cell.getAttribute('width'))).toBeCloseTo(
      Number(squareFill.getAttribute('width')) + 2
    )
    // Each x label has a tick mark above it, like the histogram's, and lies flat because it
    // fits under its square.
    const xTickLabels = screen.getAllByTestId('genotype-length-x-tick-label')
    const xTickMarks = screen.getAllByTestId('genotype-length-x-tick-mark')
    expect(xTickMarks.map((mark) => mark.getAttribute('x1'))).toEqual(
      xTickLabels.map((label) => label.getAttribute('x'))
    )
    expect(
      xTickLabels.every(
        (label) =>
          label.getAttribute('transform') == null && label.getAttribute('text-anchor') === 'middle'
      )
    ).toBe(true)
    fireEvent.keyDown(cell, { key: 'Enter' })
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    expect(
      screen.getByRole('heading', {
        name: '0 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()
    expect(
      screen.getByRole('table', { name: 'Source ALT allele index' }).getAttribute('aria-rowcount')
    ).toBe('1')
    fireEvent.keyDown(cell, { key: ' ' })
    expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
  })

  test('rotates the heatmap x labels, keeping their tick marks, when they do not fit under their squares', () => {
    const referenceId = '__REFERENCE__'
    // 40 sizes make squares narrower than a label like "+39".
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: referenceId,
      called_samples: 40,
      called_alleles: 80,
      cells: Array.from({ length: 40 }, (_, longerDelta) => ({
        shorter_delta: 0,
        longer_delta: longerDelta,
        people: 1,
        pairs: [
          {
            shorter_allele_id: referenceId,
            longer_allele_id: referenceId,
            ancestry_group: 'unknown',
            sex: 'unknown',
            people: 1,
            phased_people: 0,
            unphased_people: 1,
          },
        ],
      })),
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={alleles}
        navigation={navigation}
      />
    )
    const xTickLabels = screen.getAllByTestId('genotype-length-x-tick-label')
    expect(
      xTickLabels.every(
        (label) =>
          label.getAttribute('transform')?.startsWith('rotate(-48') &&
          label.getAttribute('text-anchor') === 'end'
      )
    ).toBe(true)
    expect(screen.getAllByTestId('genotype-length-x-tick-mark')).toHaveLength(xTickLabels.length)
  })

  test('unions genotype-region contributors, bypasses frequency AC, and excludes the reference sentinel', () => {
    const referenceId = '__REFERENCE__'
    const genotypeAlleles = alleles.map((allele) => ({
      ...allele,
      freq: { ...allele.freq, all: { ...allele.freq.all, ac: 0, af: 0 } },
    }))
    const genotypeLandscape: WholeRecordGenotypeLandscapeData = {
      status: 'AVAILABLE',
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP',
      reference_allele_id: referenceId,
      called_samples: 2,
      called_alleles: 4,
      cells: [
        {
          shorter_delta: -6,
          longer_delta: 0,
          people: 1,
          pairs: [
            {
              shorter_allele_id: referenceId,
              longer_allele_id: alleles[0].variant_id,
              ancestry_group: 'unknown',
              sex: 'unknown',
              people: 1,
              phased_people: 0,
              unphased_people: 1,
            },
          ],
        },
        {
          shorter_delta: 0,
          longer_delta: 12,
          people: 1,
          pairs: [
            {
              shorter_allele_id: alleles[1].variant_id,
              longer_allele_id: alleles[2].variant_id,
              ancestry_group: 'unknown',
              sex: 'unknown',
              people: 1,
              phased_people: 1,
              unphased_people: 0,
            },
          ],
        },
      ],
    }
    render(
      <WholeRecordAlleleLandscape
        landscape={alleleLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={genotypeAlleles}
        navigation={navigation}
      />
    )
    const cells = screen.getAllByTestId('genotype-length-cell-target')
    const firstCell = screen.getByRole('button', {
      name: /0 bp vs REF longer allele, −6 bp vs REF shorter allele/,
    })
    fireEvent.click(firstCell)
    fireEvent.keyDown(firstCell, { key: 'ArrowRight', shiftKey: true })
    expect(cells.every((cell) => cell.getAttribute('aria-pressed') === 'true')).toBe(true)
    expect(screen.getAllByTestId('genotype-length-selection-boundary')).toHaveLength(1)
    const selectedCells = screen
      .getByTestId('genotype-length-card')
      .querySelectorAll('rect[fill="#003f63"]')
    expect(selectedCells).toHaveLength(2)
    expect(
      Array.from(selectedCells).every(
        (cell) =>
          cell.getAttribute('stroke') === '#222' && cell.getAttribute('stroke-width') === '2'
      )
    ).toBe(true)
    expect(
      screen.getByTestId('genotype-length-card').querySelectorAll('text[fill="#fff"]').length
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getByTestId('genotype-length-selection-boundary').getAttribute('stroke')).toBe(
      '#222'
    )
    expect(
      screen.getByRole('heading', {
        name: '3 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()
    expect(screen.queryByTitle(referenceId)).toBeNull()
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
      cells: [{ shorter_delta: -6, longer_delta: 12, people: 12, pairs: duplicatePairs }],
    }
    // The API admits only the groups that both the allele and genotype data have.
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={stratifiedAlleles}
        navigation={navigation}
        filterContract={approvedFilterContract(['afr'], ['XX'])}
      />
    )
    const filters = screen.getByRole('group', {
      name: 'API-admitted ancestry and sex filters for visible allelic-landscape plots',
    })
    expect(
      screen.getByRole('group', { name: 'Total-length histogram display controls' })
    ).not.toBeNull()
    expect(within(filters).queryByRole('option', { name: 'nfe' })).toBeNull()
    fireEvent.change(within(filters).getByLabelText('Genetic ancestry group'), {
      target: { value: 'afr' },
    })
    expect(screen.getByText(/Biallelic genotypes for 6 individuals/)).not.toBeNull()
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
        name: /−6 bp vs REF; 1 called non-reference allele copy in this view; 1 distinct ALT allele/,
      })
    ).not.toBeNull()
    expect(screen.getByText(/Biallelic genotypes for 6 individuals/)).not.toBeNull()

    rendered.rerender(
      <WholeRecordAlleleLandscape
        landscape={stratifiedLandscape}
        genotypeLandscape={genotypeLandscape}
        alleles={stratifiedAlleles}
        navigation={navigation}
        filterContract={approvedFilterContract(['nfe'], ['XY'])}
      />
    )
    await waitFor(() => {
      expect(
        (within(filters).getByLabelText('Genetic ancestry group') as HTMLSelectElement).value
      ).toBe('')
      expect((within(filters).getByLabelText('Sex') as HTMLSelectElement).value).toBe('')
    })
    expect(screen.getByText(/Biallelic genotypes for 12 individuals/)).not.toBeNull()
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
    const filterContract = approvedFilterContract(['afr'], [])
    const rendered = render(
      <WholeRecordAlleleLandscape
        landscape={landscape}
        markFilterScope={scope}
        alleles={stratifiedAlleles}
        navigation={navigation}
        filterContract={filterContract}
      />
    )
    fireEvent.change(screen.getByLabelText('Genetic ancestry group'), {
      target: { value: 'afr' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /−6 bp vs REF; 2 called non-reference allele copies/ })
    )
    expect(
      screen.getByRole('heading', { name: '1 of 3 non-reference alleles selected' })
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
        filterContract={filterContract}
      />
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Allele Details' })).not.toBeNull()
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
      cells: [{ shorter_delta: -6, longer_delta: 12, people: 12, pairs: duplicatePairs }],
    }
    render(<WholeRecordGenotypeLandscape landscape={landscape} />)

    const heatmap = screen.getByRole('group', {
      name: 'Genotype distribution by change from REF',
    })
    expect(heatmap.tagName.toLowerCase()).toBe('svg')
    expect(heatmap).toHaveStyleRule('width', '100%')
    // The narrow-screen width sits on the box the SVG fills, which is what gets measured to size
    // the axis text.
    expect(heatmap.parentElement).toHaveStyleRule('width', '520px', { media: '(max-width:700px)' })
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
    // The click target is exactly the square (45 units wide at most), so it never covers a
    // neighboring square.
    expect(cell.getAttribute('width')).toBe('45')
    expect(cell.getAttribute('height')).toBe('45')
    expect(heatmap.querySelector(`rect[fill="${LONG_READ_PRIMARY_PLOT_COLOR}"]`)).not.toBeNull()
    expect(within(heatmap).getByText('Long Allele (bp minus REF)')).not.toBeNull()
    expect(within(heatmap).getByText('Short Allele (bp minus REF)')).not.toBeNull()
    expect(screen.getByLabelText('Logarithmic people intensity legend')).not.toBeNull()
    expect(cell.getAttribute('aria-pressed')).toBe('false')
    // The exact genotype pair table under the heatmap was removed.
    expect(screen.queryByRole('region', { name: 'Exact genotype pairs table' })).toBeNull()
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

    const track = screen.getByRole('group', { name: /component 1 has a neutral dotted outline/ })
    const outlined = track.querySelectorAll('[data-exact-reference-component-match="true"]')
    expect(outlined).toHaveLength(1)
    expect(outlined[0].getAttribute('fill')).toBe(motifColor('CAG', locus.motifs))
    expect(outlined[0].getAttribute('stroke')).toBe('#111')
    // A thin dotted outline like the legend key's, which is filled with the outlined component's
    // motif color.
    expect(outlined[0].getAttribute('stroke-width')).toBe('2')
    expect(outlined[0].getAttribute('stroke-dasharray')).toBe('2 2')
    expect(outlined[0].textContent).toBe(
      'Component 1, CAG, chr4:0–12, 12 bp; known disease-associated tandem repeat'
    )
    const legend = screen.getByLabelText('Variation cluster reference region legend')
    expect(legend.textContent).toContain('Known disease-associated tandem repeat')
    // The browser reports the color as rgb(), so compare it with the same color set the same way.
    const motifColorSwatch = document.createElement('span')
    motifColorSwatch.style.background = motifColor('CAG', locus.motifs)
    expect((legend.firstElementChild as HTMLElement).style.background).toBe(
      motifColorSwatch.style.background
    )
    expect(track.querySelector('[data-catalog-pathogenic-match]')).toBeNull()
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

    expect(screen.queryByLabelText(/allele size measure$/)).toBeNull()
    expect(screen.queryByLabelText('Genetic ancestry group')).toBeNull()
    expect(screen.queryByLabelText('Sex')).toBeNull()
    expect(screen.queryByLabelText('Color by')).toBeNull()
    expect(screen.queryByText(/Unavailable pending exact shared vocabulary/)).toBeNull()
    expect(screen.queryByText(/Represented allele length is disabled/)).toBeNull()
    const heading = screen.getByRole('heading', { name: 'Allelic Landscape' })
    expect(heading.parentElement?.nextElementSibling?.getAttribute('data-testid')).toBe(
      'whole-record-allele-plot-grid'
    )
    // The called allele copy count sits under the allele card heading, as the genotype card's
    // people count does.
    const alleleHeading = screen.getByRole('heading', { name: 'Allele length distribution' })
    expect(alleleHeading.nextElementSibling?.getAttribute('aria-live')).toBe('polite')
    expect(alleleHeading.nextElementSibling?.textContent).toMatch(
      /^Sizes of [\d,]+ alleles( from [\d,]+ individuals)?$/
    )

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

    const controls = screen.getByRole('group', { name: 'Allelic Landscape controls' })
    expect(Array.from(controls.children).every((child) => child.childElementCount > 0)).toBe(true)
    const group = screen.getByRole('group', {
      name: 'API-admitted ancestry and sex filters for visible allelic-landscape plots',
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
            element.textContent === 'Sizes of 6 alleles'
        )
      )
    ).not.toBeNull()
    expect(screen.getByText(/Biallelic genotypes for 4 individuals/)).not.toBeNull()
    fireEvent.change(sex, { target: { value: 'approved-source-sex-a' } })
    expect(
      screen.getByText((_text, element) =>
        Boolean(
          element?.getAttribute('aria-live') === 'polite' &&
            element.textContent === 'Sizes of 6 alleles'
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
    const axis = screen.getByLabelText(
      'Allele length distribution allele size measure'
    ) as HTMLSelectElement
    expect(
      (
        within(axis).getByRole('option', {
          name: 'ALT allele size (bp)',
        }) as HTMLOptionElement
      ).disabled
    ).toBe(false)
    fireEvent.change(axis, { target: { value: 'absolute' } })
    expect(screen.getByRole('heading', { name: 'Allele length distribution' })).not.toBeNull()
    expect(screen.queryByText('94 bp (−6 bp vs REF)')).toBeNull()
    expect(screen.getAllByLabelText(/94 bp \(−6 bp vs REF\)/).length).toBeGreaterThan(0)
    const representedRow = screen.getByTitle(`${sourceId}~1`)
    expect(within(representedRow).getAllByRole('cell')[2].textContent).toBe('94')
    expect(within(representedRow).getAllByRole('cell')[3].textContent).toBe('−6')
    const firstBar = screen.getByRole('button', { name: /94 bp \(−6 bp vs REF\)/ })
    fireEvent.click(firstBar)
    fireEvent.keyDown(firstBar, { key: 'ArrowRight', shiftKey: true })
    expect(
      screen.getByRole('heading', {
        name: '2 of 3 non-reference alleles selected',
      })
    ).not.toBeNull()

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
    expect(screen.queryByLabelText(/allele size measure$/)).toBeNull()
    expect(screen.queryByRole('option', { name: 'ALT allele size (bp)' })).toBeNull()
    expect(screen.queryByText(/Represented allele length is disabled/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Allele length distribution' })).not.toBeNull()
    expect(screen.queryByText(/bp \(−6 bp vs REF\)/)).toBeNull()
    expect(within(screen.getByTitle(`${sourceId}~1`)).getAllByRole('cell')[2].textContent).toBe('—')
  })

  test('uses one stable color per motif and explains the variation cluster reference region accessibly', () => {
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
      Number(
        screen
          .getByRole('group', { name: /ordered components/ })
          .querySelectorAll('rect')[0]
          .getAttribute('width')
      )
    ).toBeCloseTo(8.8)
    expect(
      screen.getByRole('heading', { name: 'Variation Cluster Reference Region' })
    ).not.toBeNull()
    // The section heading has the same name, so the help button is found by its role.
    fireEvent.click(screen.getByRole('button', { name: 'Variation Cluster Reference Region' }))
    expect(screen.getByText(/callset.*ordered coordinate-and-motif intervals/)).not.toBeNull()
    expect(screen.getByText(/zero-based and half-open, as in the locus ID/)).not.toBeNull()
    expect(screen.getByText(/Overlapping intervals use separate lanes/)).not.toBeNull()
    expect(screen.getByText(/interval and order are part of their identity/)).not.toBeNull()
    expect(screen.getByText(/do not classify an LR component/)).not.toBeNull()
  })

  test('labels a long motif by its ends and length, and leaves a box too narrow for its label empty', () => {
    const longMotif = `TGGTGTCC${'A'.repeat(83)}AGTCTTAC`
    const locus = {
      motifs: [longMotif, 'CAGCAGCAGCAGCAGCAG'],
      components: [
        { chrom: '19', start0: 0, end0: 300, motif: longMotif },
        { chrom: '19', start0: 300, end0: 310, motif: 'CAGCAGCAGCAGCAGCAG' },
      ],
      region: { chrom: '19', start0: 0, end0: 310, size: 310 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} />)

    const labels = Array.from(
      screen.getByRole('group', { name: /ordered components/ }).querySelectorAll('text')
    ).map((text) => text.textContent)
    expect(labels).toContain('TGGTGTCC…AGTCTTAC (99 bp)')
    expect(labels).not.toContain(longMotif)
    // The 18 bp motif's 10 bp box is too narrow for its label, which hovering still shows.
    expect(labels).not.toContain('CAGCAGCAGCAGCAGCAG')
  })

  test("opens a dialog with a component box's zero-based interval and full motif", () => {
    const longMotif = `CCCCCGTG${'C'.repeat(17)}GGGGCCC`
    const locus = {
      motifs: [longMotif, 'CCG'],
      components: [
        { chrom: '9', start0: 133071240, end0: 133071499, motif: longMotif },
        { chrom: '9', start0: 133071499, end0: 133071508, motif: 'CCG' },
      ],
      region: { chrom: '9', start0: 133071240, end0: 133071608, size: 368 },
    } as LongReadTrLocus
    render(<LongReadTrComponentTrack locus={locus} />)

    const dialogLines = () =>
      Array.from(screen.getByRole('dialog').querySelectorAll('p')).map((line) => line.textContent)

    fireEvent.click(screen.getByRole('button', { name: /^Component 1,/ }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Variation Cluster: Tandem Repeat #1')).not.toBeNull()
    expect(dialogLines()).toEqual([
      `Motif: ${longMotif} (${longMotif.length} bp)`,
      'Reference Region: chr9:133,071,240–133,071,499 (259 bp)',
    ])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ok' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    // A narrow box with no text opens its dialog from the keyboard too. Its 3 bp motif needs no
    // size.
    fireEvent.keyDown(screen.getByRole('button', { name: /^Component 2,/ }), { key: 'Enter' })
    expect(dialogLines()).toEqual([
      'Motif: CCG',
      'Reference Region: chr9:133,071,499–133,071,508 (9 bp)',
    ])
  })
})
