import React from 'react'
import 'jest-styled-components'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { Router } from 'react-router-dom'
import { createMemoryHistory } from 'history'

import LongReadTandemRepeatPage from './LongReadTandemRepeatPage'
import LongReadTandemRepeatPageContainer, {
  LONG_READ_TR_ALLELE_INDEX_LIMIT,
  longReadTandemRepeatLocusQuery,
  searchForCohort,
  searchWithSelectedAllele,
  searchWithoutSelectedAllele,
} from './LongReadTandemRepeatPageContainer'
import { componentLanes } from './LongReadTrVisualizations'

jest.mock('../Link', () => ({ children, to, preserveSelectedDataset = true, ...props }: any) => {
  const href =
    preserveSelectedDataset && String(to).startsWith('/short-tandem-repeat/')
      ? `${to}?dataset=gnomad_r4_lr`
      : to
  return (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

jest.mock('../VariantPage/ExactTrAltMotifStructure', () => ({ altAllele }: any) => (
  <div aria-label="Selected ALT motif structure grid">
    DP structure for {altAllele.length} bases
  </div>
))

jest.mock('../DocumentTitle', () => () => null)
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot', () => () => (
  <div data-testid="allele-repeat-count-plot" />
))
jest.mock('../ShortTandemRepeatPage/ShortTandemRepeatGenotypeDistributionPlot', () => () => (
  <div data-testid="genotype-repeat-count-plot" />
))
jest.mock('../Query', () => ({ children, variables, ...props }: any) => {
  ;(global as any).__TR_QUERY_PROPS__ = props
  return children(
    (global as any).__TR_QUERY_STATE__ || {
      data: { long_read_tandem_repeat_locus: (global as any).__TR_QUERY_DATA__ },
      requestVariables: variables,
      stale: false,
    }
  )
})

jest.mock('react-window', () => ({
  FixedSizeList: ({ children: Row, className, itemCount, itemData }: any) => (
    <div className={className} data-testid="virtual-exact-index" data-item-count={itemCount}>
      {Array.from({ length: itemCount }, (_, index) => (
        <Row key={index} index={index} style={{ height: 36 }} data={itemData} />
      ))}
    </div>
  ),
}))

jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Page: ({ children }: any) => <main>{children}</main>,
  PageHeading: ({ children }: any) => <h1>{children}</h1>,
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  TooltipAnchor: ({ children }: any) => children,
  TooltipHint: ({ children }: any) => children,
}))

const sourceVariantId = 'chr4-3074876-TRV-164'
const exactId = `${sourceVariantId}~2`
const components = [
  { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  { chrom: '4', start0: 3074927, end0: 3074936, motif: 'CAA' },
  { chrom: '4', start0: 3074936, end0: 3074960, motif: 'CCG' },
  { chrom: '4', start0: 3074960, end0: 3074984, motif: 'CCT' },
  { chrom: '4', start0: 3074984, end0: 3075008, motif: 'GCC' },
  { chrom: '4', start0: 3075008, end0: 3075040, motif: 'CCG' },
]

const alleleLength = (altIndex: number) => {
  if (altIndex === 1) return 0
  if (altIndex === 2) return -6
  return ((altIndex % 25) - 12) * 3
}

const makeAllele = (altIndex: number) => ({
  variant_id: `${sourceVariantId}~${altIndex}`,
  source_variant_id: sourceVariantId,
  alt_index: altIndex,
  alt_count: 72,
  length: alleleLength(altIndex),
  repeat_count: null,
  repeat_count_source: null,
  motif_purity: altIndex === 3 ? null : 0.95 + (altIndex % 10) / 1000,
  freq: {
    all: { ac: altIndex === 2 ? 120 : 1, an: 584, af: altIndex === 2 ? 120 / 584 : 1 / 584 },
    populations: [],
  },
})

const makeLocus = (count = 72) => {
  const alleles = Array.from({ length: count }, (_, index) => ({
    ...makeAllele(index + 1),
    alt_count: count,
  }))
  return {
    id: '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074936-3074960-CCG+4-3074960-3074984-CCT+4-3074984-3075008-GCC+4-3075008-3075040-CCG',
    source_trid:
      '4-3074876-3074933-CAG,4-3074927-3074936-CAA,4-3074936-3074960-CCG,4-3074960-3074984-CCT,4-3074984-3075008-GCC,4-3075008-3075040-CCG',
    reference_genome: 'GRCh38',
    chrom: '4',
    region: { chrom: '4', start0: 3074876, end0: 3075040, size: 164 },
    motifs: ['CAG', 'CAA', 'CCG', 'CCT', 'GCC'],
    structure: '(CAG)n',
    lr_cohort: 'hgsvc_hprc' as const,
    source_release: 'y1',
    source_run_id: 'run-hgsvc',
    total_alleles: count,
    exact_alt_count: count,
    exact_alt_count_complete: true,
    exact_alt_count_unavailable_reason: null,
    delta_min: -24,
    delta_max: 48,
    delta_unavailable_reason: null,
    called_allele_count: 584,
    called_sample_count: 292,
    unique_carrier_count: 278,
    sequences_available: true,
    sequences_unavailable_reason: null,
    selected_allele_valid: true,
    selected_allele_unavailable_reason: null,
    selected_allele: {
      ...alleles[1],
      ref: 'ACAGCAG',
      alt: 'ACAGCAA',
      motif_purity_source: 'source_ap_allele',
      decomposition_status: 'UNAVAILABLE_COMPOUND_LOCUS',
      decomposition_reason:
        'Observed sequence tokens cannot be assigned to coordinate-defined source components',
      rsids: ['rs-test'],
      filters: [],
      major_consequence: 'intron_variant',
      cadd_phred: 3.2,
      phylop: null,
      short_read_match_id: null,
      short_read_match_type: null,
      short_read_match_source: null,
      source_release: 'y1',
      source_run_id: 'run-hgsvc',
    },
    component_measurement_available: false,
    component_measurement_unavailable_reason:
      'Compound loci lack an admitted mapping from whole-record sequence to source components',
    components,
    source_records: [
      {
        record_index: 1,
        source_variant_id: sourceVariantId,
        task_id: 'task',
        attempt_id: 'attempt',
        position: 3074877,
        alt_count: count,
        ref: 'ACAGCAG',
        non_reference_ac: 556,
        an: 584,
        non_reference_af: 556 / 584,
        source: 'HGSVC',
        region: 'HTT',
      },
    ],
    short_read_matches: [{ id: 'HTT', gene_symbol: 'HTT' }],
    whole_record_allele_landscape: {
      status: 'AVAILABLE' as const,
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP' as const,
      called_alleles: 584,
      non_reference_called_alleles: 556,
      reference_called_alleles: 28,
      exact_alt_count: count,
      stratified_available: true,
      stratified_unavailable_reason: null,
      ancestry_groups: ['afr', 'nfe'],
      sexes: ['XX', 'XY'],
      bins: [
        {
          delta: -6,
          called_alleles: 134,
          exact_alt_count: 2,
          allele_ids: [`${sourceVariantId}~2`, `${sourceVariantId}~3`],
          stacks: [{ ancestry_group: 'afr', sex: null, called_alleles: 30 }],
        },
        {
          delta: 0,
          called_alleles: 40,
          exact_alt_count: 1,
          allele_ids: [`${sourceVariantId}~1`],
          stacks: [{ ancestry_group: 'afr', sex: null, called_alleles: 10 }],
        },
        {
          delta: 48,
          called_alleles: 5,
          exact_alt_count: 1,
          allele_ids: [`${sourceVariantId}~4`],
          stacks: [],
        },
      ],
      purity_points: [
        { allele_id: `${sourceVariantId}~1`, delta: 0, motif_purity: 0.951, called_alleles: 40 },
        { allele_id: exactId, delta: -6, motif_purity: 0.952, called_alleles: 120 },
      ],
      purity_available: true,
      purity_unavailable_reason: null,
    },
    whole_record_genotype_landscape: {
      status: 'AVAILABLE' as const,
      reason_code: null,
      unit: 'WHOLE_RECORD_DELTA_BP' as const,
      reference_allele_id: '__REFERENCE__',
      called_samples: 292,
      called_alleles: 584,
      ancestry_groups: ['afr', 'nfe'],
      sexes: ['XX', 'XY'],
      cells: [
        {
          shorter_delta: 0,
          longer_delta: 0,
          people: 20,
          pairs: [
            {
              shorter_allele_id: '__REFERENCE__',
              longer_allele_id: `${sourceVariantId}~1`,
              ancestry_group: 'afr',
              sex: 'XX',
              people: 8,
              phased_people: 5,
              unphased_people: 3,
            },
            {
              shorter_allele_id: `${sourceVariantId}~1`,
              longer_allele_id: `${sourceVariantId}~1`,
              ancestry_group: 'nfe',
              sex: 'XY',
              people: 12,
              phased_people: 10,
              unphased_people: 2,
            },
          ],
        },
        {
          shorter_delta: -6,
          longer_delta: 0,
          people: 272,
          pairs: [
            {
              shorter_allele_id: exactId,
              longer_allele_id: '__REFERENCE__',
              ancestry_group: 'afr',
              sex: 'XX',
              people: 272,
              phased_people: 200,
              unphased_people: 72,
            },
          ],
        },
      ],
    },
    repeat_count_plots: {
      status: 'UNAVAILABLE_COMPOUND_LOCUS',
      reason_code: 'COMPOUND_LOCUS',
      repeat_unit: null,
      max_repunits: null,
      allele_size_distribution: [],
      genotype_distribution: [],
    },
    alleles: { nodes: alleles, page_info: { has_next_page: false } },
  }
}

const makeSimpleLocus = () => ({
  ...makeLocus(),
  component_measurement_available: true,
  component_measurement_unavailable_reason: null,
  components: [{ chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' }],
  motifs: ['CAG'],
  repeat_count_plots: {
    status: 'AVAILABLE_EXACT',
    reason_code: null,
    repeat_unit: 'CAG',
    max_repunits: 13,
    allele_size_distribution: [
      {
        ancestry_group: 'afr',
        sex: 'XX' as const,
        repunit: 'CAG',
        distribution: [
          { repunit_count: 10, frequency: 18, colorByValue: null },
          { repunit_count: 11, frequency: 36, colorByValue: null },
        ],
      },
    ],
    genotype_distribution: [
      {
        ancestry_group: 'afr',
        sex: 'XX' as const,
        short_allele_repunit: 'CAG',
        long_allele_repunit: 'CAG',
        distribution: [
          {
            short_allele_repunit_count: 10,
            long_allele_repunit_count: 11,
            frequency: 9,
          },
        ],
      },
    ],
  },
})

const navigation = {
  hrefForAllele: (id: string) => `/tandem-repeat/locus?dataset=gnomad_r4_lr&keep=1&allele=${id}`,
  onSelectAllele: jest.fn(),
}

const renderPage = ({
  locus = makeLocus(),
  selectedAllele = exactId,
  onCohortChange = jest.fn(),
  onInvalidSelection = jest.fn(),
}: any = {}) =>
  render(
    <ThemeProvider
      theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
    >
      <LongReadTandemRepeatPage
        datasetId="gnomad_r4_lr"
        locus={locus}
        selectedAllele={selectedAllele}
        onCohortChange={onCohortChange}
        onInvalidSelection={onInvalidSelection}
        navigation={navigation}
      />
    </ThemeProvider>
  )

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
const scrollIntoView = jest.fn()
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
)
afterAll(() => {
  if (originalScrollIntoView)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    })
})
beforeEach(() => {
  navigation.onSelectAllele.mockClear()
  scrollIntoView.mockClear()
  delete (global as any).__TR_QUERY_STATE__
  delete (global as any).__TR_QUERY_PROPS__
})

describe('canonical long-read tandem-repeat locus page', () => {
  test('renders grounded source attributes and ordered overlapping components', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Tandem repeat at chr4:3,074,877–3,075,040' })
    ).not.toBeNull()
    expect(screen.getByText('GRCh38 / hg38')).not.toBeNull()
    expect(
      screen.getByText(/72 exact ALT sequences; whole-record Δ length −24 to \+48 bp/)
    ).not.toBeNull()
    expect(screen.getAllByText(sourceVariantId, { selector: 'code' }).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('img', { name: '6 ordered source repeat components in 2 coordinate lanes' })
    ).not.toBeNull()
    expect(
      screen.getByText(
        (_text, element) =>
          Boolean(element?.textContent?.includes('CCG — chr4:3,075,009–3,075,040')),
        { selector: 'li' }
      )
    ).not.toBeNull()
    expect(componentLanes(components)).toEqual([0, 1, 0, 0, 0, 0])
  })

  test('states compound measurement limits and signed whole-record semantics', () => {
    renderPage()
    expect(screen.getAllByText(/Compound loci lack an admitted mapping/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/not a component repeat count/).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: 'Measurement availability' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Data availability' })).toBeNull()
    expect(
      screen.getByRole('button', { name: /−6 bp, 134 called allele copies.*2 exact ALTs/ })
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: /\+48 bp, 5 called allele copies/ })).not.toBeNull()
  })

  test('lays out admitted simple-locus repeat-count plots compactly and responsively', () => {
    renderPage({ locus: makeSimpleLocus(), selectedAllele: undefined })

    const grid = screen.getByTestId('lr-tr-repeat-count-grid')
    const headings = within(grid).getAllByRole('heading', { level: 3 })

    expect(headings.map((heading) => heading.textContent)).toEqual([
      expect.stringContaining('Allele repeat-count distribution'),
      expect.stringContaining('Genotype repeat-count distribution'),
    ])
    expect(within(grid).getByTestId('allele-repeat-count-plot')).not.toBeNull()
    expect(within(grid).getByTestId('genotype-repeat-count-plot')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Whole-record genotype distribution' })).toBeNull()
    expect(grid).toHaveStyleRule('grid-template-columns', 'repeat(2,minmax(0,calc(50% - 0.625em)))')
    expect(grid).toHaveStyleRule('grid-template-columns', 'minmax(0,100%)', {
      media: '(max-width:900px)',
    })
  })

  test('puts the complete index and selected detail first in a responsive allele browser', () => {
    renderPage()
    const landscape = screen.getByRole('heading', { name: 'Allelic landscape' }).closest('section')
    const browser = screen.getByTestId('lr-tr-exact-allele-browser')
    const index = screen.getByRole('table', { name: 'Exact alternate allele index' })
    const selectedDetail = screen.getByTestId('lr-tr-selected-detail')
    const selectedBin = screen
      .getByRole('heading', { name: '2 of 72 exact ALTs at −6 bp' })
      .closest('section')
    const genotypeHeading = screen.getByRole('heading', {
      name: 'Whole-record genotype distribution',
    })

    expect(landscape?.contains(browser)).toBe(true)
    expect(browser.contains(index)).toBe(true)
    expect(browser.contains(selectedDetail)).toBe(true)
    expect(index.compareDocumentPosition(selectedDetail)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(selectedBin?.contains(selectedDetail)).toBe(false)
    expect(selectedDetail.compareDocumentPosition(selectedBin as HTMLElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(selectedBin?.compareDocumentPosition(genotypeHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(browser).toHaveStyleRule('grid-template-columns', 'minmax(390px,42%) minmax(0,58%)')
    expect(browser).toHaveStyleRule('grid-template-columns', 'minmax(0,100%)', {
      media: '(max-width:900px)',
    })
  })

  test('links to the explicit short-read dataset without preserving the long-read dataset', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'HTT short-read details' }).getAttribute('href')).toBe(
      '/short-tandem-repeat/HTT?dataset=gnomad_r4'
    )
  })

  test('bin subset is explicitly bounded and keeps identities, frequencies, and URL controls', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: '2 of 72 exact ALTs at −6 bp' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /0 bp, 40 called allele copies/ }))
    expect(screen.getByRole('heading', { name: '1 of 72 exact ALTs at 0 bp' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /−6 bp, 134 called allele copies/ }))
    const table = screen.getByRole('table', { name: 'Exact alleles at −6 bp' })
    const selectedControl = within(table).getByRole('link', { name: 'Select ALT 2' })
    const otherControl = within(table).getByRole('link', { name: 'Select ALT 3' })

    expect(within(table).getByText(`${sourceVariantId}~2`)).not.toBeNull()
    expect(within(table).getByText(`${sourceVariantId}~3`)).not.toBeNull()
    expect(within(table).queryByLabelText('Selected ALT motif structure grid')).toBeNull()
    expect(selectedControl.closest('tr')?.getAttribute('aria-selected')).toBe('true')
    expect(otherControl.closest('tr')?.getAttribute('aria-selected')).toBe('false')
    expect(fireEvent.click(otherControl)).toBe(false)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(`${sourceVariantId}~3`)
  })

  test('links purity and exact detail and preserves source decomposition caveat', () => {
    renderPage()
    const detail = screen.getByTestId('lr-tr-selected-detail')
    expect(detail).toBe(document.activeElement)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(within(detail).getByText(exactId)).not.toBeNull()
    expect(within(detail).getByText(/source_ap_allele/)).not.toBeNull()
    expect(within(detail).getByText(/not source-coordinate components/)).not.toBeNull()
    expect(within(detail).getByLabelText('Selected ALT motif structure grid')).not.toBeNull()
    expect(
      screen.getByRole('group', {
        name: /exact alleles plotted by whole-record length difference and source purity/,
      })
    ).not.toBeNull()
  })

  test('distinguishes reference identity from a zero-delta exact ALT in genotype pair detail', () => {
    renderPage()
    expect(
      screen.getByText(
        (_text, element) =>
          Boolean(element?.textContent?.includes('Reference (Δ 0) is an explicit identity')),
        { selector: 'p' }
      )
    ).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'ALT 1' }).length).toBeGreaterThan(0)
    const zeroDeltaCell = screen.getByRole('gridcell', {
      name: '0 bp longer, 0 bp shorter: 20 people',
    })
    expect(zeroDeltaCell).not.toBeNull()
    expect(zeroDeltaCell.closest('[role="row"]')).not.toBeNull()
  })

  test.each([72, 497])('shows all %s exact ALTs in the primary virtualized browser', (count) => {
    renderPage({ locus: makeLocus(count), selectedAllele: undefined })
    const heading = screen.getByRole('heading', { name: `All exact ALTs (${count})` })
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    expect(heading.closest('details')).toBeNull()
    const virtualIndex = within(section as HTMLElement).getByTestId('virtual-exact-index')
    expect(virtualIndex.getAttribute('data-item-count')).toBe(String(count))
    expect(virtualIndex.classList.contains('lr-tr-exact-index-scroll')).toBe(true)
    const finalRow = screen.getByTitle(`${sourceVariantId}~${count}`)
    expect(finalRow.getAttribute('aria-rowindex')).toBe(String(count + 1))
    expect(
      screen
        .getByRole('table', { name: 'Exact alternate allele index' })
        .getAttribute('aria-rowcount')
    ).toBe(String(count + 1))
  })

  test('reports invalid selection once and delegates URL cleanup', async () => {
    const onInvalidSelection = jest.fn()
    renderPage({
      locus: { ...makeLocus(), selected_allele_valid: false, selected_allele: null },
      selectedAllele: 'other~9',
      onInvalidSelection,
    })
    expect(screen.getByRole('alert').textContent).toContain('removed from the URL')
    await waitFor(() => expect(onInvalidSelection).toHaveBeenCalledTimes(1))
  })

  test('keeps a belonging selection when its bounded detail is unavailable', () => {
    const onInvalidSelection = jest.fn()
    renderPage({
      locus: {
        ...makeLocus(),
        selected_allele_valid: true,
        selected_allele_unavailable_reason: 'SELECTED_ALLELE_DETAIL_BYTE_BOUND_EXCEEDED',
        selected_allele: null,
      },
      selectedAllele: exactId,
      onInvalidSelection,
    })
    expect(screen.queryByText(/does not belong to this locus or cohort/)).toBeNull()
    expect(onInvalidSelection).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        (_text, element) =>
          element?.tagName === 'LI' &&
          element.textContent ===
            'Selected exact sequence/detail: selected allele detail byte bound exceeded'
      )
    ).not.toBeNull()
  })

  test('cohort selection delegates push/clear semantics to the container', () => {
    const onCohortChange = jest.fn()
    renderPage({ onCohortChange })
    fireEvent.change(screen.getByLabelText('Long-read cohort'), { target: { value: 'aou' } })
    expect(onCohortChange).toHaveBeenCalledWith('aou')
  })

  test('keeps source provenance compact and accessible', () => {
    renderPage()
    const provenance = screen.getByText('Source provenance').closest('details')
    expect(provenance).not.toBeNull()
    expect(provenance?.hasAttribute('open')).toBe(false)
    expect(
      within(provenance as HTMLElement).getByText('run-hgsvc', { selector: 'code' })
    ).not.toBeNull()
  })

  test('renders API-driven unavailable states without an empty plot', () => {
    const locus = makeLocus()
    locus.whole_record_allele_landscape = {
      ...locus.whole_record_allele_landscape,
      status: 'UNAVAILABLE',
      reason_code: 'BOUND_EXCEEDED',
      bins: null,
      purity_points: null,
    } as any
    locus.whole_record_genotype_landscape = {
      ...locus.whole_record_genotype_landscape,
      status: 'UNAVAILABLE',
      reason_code: 'NO_METADATA',
      cells: null,
    } as any
    renderPage({ locus })
    expect(
      screen.getByText(/Whole-record allele landscape unavailable: bound exceeded/)
    ).not.toBeNull()
    expect(screen.getByText(/Genotype landscape unavailable: no metadata/)).not.toBeNull()
  })

  test('container retains the displayed locus and selection until new exact detail arrives', () => {
    const staleLocus = makeLocus()
    const nextAlleleId = `${sourceVariantId}~1`
    const freshLocus = makeLocus()
    freshLocus.selected_allele = {
      ...freshLocus.selected_allele,
      ...freshLocus.alleles.nodes[0],
      ref: 'ACAGCAG',
      alt: 'ACAGCAG',
    }
    const history = createMemoryHistory({
      initialEntries: [
        `/tandem-repeat/${staleLocus.id}?dataset=gnomad_r4_lr&allele=${nextAlleleId}`,
      ],
    })
    ;(global as any).__TR_QUERY_STATE__ = {
      data: { long_read_tandem_repeat_locus: staleLocus },
      requestVariables: { allele: exactId },
      stale: true,
    }
    const page = (
      <Router history={history}>
        <ThemeProvider
          theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
        >
          <LongReadTandemRepeatPageContainer
            datasetId="gnomad_r4_lr"
            locusId={staleLocus.id}
            lrCohort="hgsvc_hprc"
            selectedAllele={nextAlleleId}
          />
        </ThemeProvider>
      </Router>
    )
    const rendered = render(page)

    expect((global as any).__TR_QUERY_PROPS__.retainPreviousData).toBe(true)
    expect(screen.getByRole('heading', { name: 'ALT 2 exact detail' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'All exact ALTs (72)' })).not.toBeNull()
    ;(global as any).__TR_QUERY_STATE__ = {
      data: { long_read_tandem_repeat_locus: freshLocus },
      requestVariables: { allele: nextAlleleId },
      stale: false,
    }
    rendered.rerender(React.cloneElement(page))

    expect(screen.getByRole('heading', { name: 'ALT 1 exact detail' })).not.toBeNull()
    expect(screen.getByTestId('lr-tr-selected-detail')).toBe(document.activeElement)
  })

  test('container pushes exact selection while preserving unrelated parameters', () => {
    const displayedLocus = makeLocus()
    displayedLocus.selected_allele = null as any
    displayedLocus.selected_allele_valid = null as any
    ;(global as any).__TR_QUERY_DATA__ = displayedLocus
    const history = createMemoryHistory({
      initialEntries: [`/tandem-repeat/${displayedLocus.id}?dataset=gnomad_r4_lr&keep=1`],
    })
    render(
      <Router history={history}>
        <ThemeProvider
          theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
        >
          <LongReadTandemRepeatPageContainer
            datasetId="gnomad_r4_lr"
            locusId={displayedLocus.id}
            lrCohort="hgsvc_hprc"
          />
        </ThemeProvider>
      </Router>
    )
    fireEvent.click(screen.getAllByRole('link', { name: 'ALT 2' })[0])
    expect(history.action).toBe('PUSH')
    expect(new URLSearchParams(history.location.search).get('allele')).toBe(exactId)
    expect(new URLSearchParams(history.location.search).get('keep')).toBe('1')
  })

  test('container replaces only an invalid allele parameter', async () => {
    const displayedLocus = makeLocus()
    displayedLocus.selected_allele = null as any
    displayedLocus.selected_allele_valid = false
    ;(global as any).__TR_QUERY_DATA__ = displayedLocus
    const history = createMemoryHistory({
      initialEntries: [
        `/tandem-repeat/${displayedLocus.id}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&keep=1&allele=bad~9`,
      ],
    })
    render(
      <Router history={history}>
        <ThemeProvider
          theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
        >
          <LongReadTandemRepeatPageContainer
            datasetId="gnomad_r4_lr"
            locusId={displayedLocus.id}
            lrCohort="hgsvc_hprc"
            selectedAllele="bad~9"
          />
        </ThemeProvider>
      </Router>
    )
    await waitFor(() => expect(history.action).toBe('REPLACE'))
    expect(new URLSearchParams(history.location.search).has('allele')).toBe(false)
    expect(new URLSearchParams(history.location.search).get('keep')).toBe('1')
    expect(new URLSearchParams(history.location.search).get('lr_cohort')).toBe('hgsvc_hprc')
  })

  test('preserves unrelated URL state across exact selection, cohort changes, and invalid cleanup', () => {
    const initial = '?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&keep=1&allele=old~1'
    expect(searchWithSelectedAllele(initial, exactId).toString()).toBe(
      'dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&keep=1&allele=chr4-3074876-TRV-164%7E2'
    )
    expect(searchForCohort(initial, 'aou').toString()).toBe(
      'dataset=gnomad_r4_lr&lr_cohort=aou&keep=1'
    )
    expect(searchWithoutSelectedAllele(initial).toString()).toBe(
      'dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&keep=1'
    )
  })

  test('queries bounded aggregate, index, selected detail, and provenance contracts', () => {
    expect(LONG_READ_TR_ALLELE_INDEX_LIMIT).toBe(600)
    expect(longReadTandemRepeatLocusQuery).toContain('first: $first')
    expect(longReadTandemRepeatLocusQuery).toContain('whole_record_allele_landscape')
    expect(longReadTandemRepeatLocusQuery).toContain('whole_record_genotype_landscape')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele_unavailable_reason')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele {')
    expect(longReadTandemRepeatLocusQuery).toContain('ref alt length')
    expect(longReadTandemRepeatLocusQuery).toContain('source_records {')
    expect(longReadTandemRepeatLocusQuery).toContain('repeat_count_plots')
    expect(longReadTandemRepeatLocusQuery).not.toContain('$after')
  })
})
