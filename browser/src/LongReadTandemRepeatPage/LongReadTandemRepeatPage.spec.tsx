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
import { componentLanes, purityPointDiameter } from './LongReadTrVisualizations'

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

jest.mock('./LocalHaplotypeBackgroundsSection', () => () => (
  <section aria-label="Experimental local haplotype backgrounds" />
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
  FixedSizeList: ({
    children: Row,
    className,
    height,
    itemCount,
    itemData,
    itemSize,
    width,
  }: any) => (
    <div
      className={className}
      data-testid="virtual-exact-index"
      data-height={height}
      data-item-count={itemCount}
      style={{ height, width }}
    >
      {Array.from({ length: itemCount }, (_, index) => (
        <Row key={index} index={index} style={{ height: itemSize }} data={itemData} />
      ))}
    </div>
  ),
}))

jest.mock('@gnomad/ui', () => ({
  BaseTable: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  ExternalLink: ({ children, href }: any) => <a href={href}>{children}</a>,
  Modal: ({ children, title }: any) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
  Page: ({ children, ...props }: any) => <main {...props}>{children}</main>,
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
  ref: 'ACAGCAG',
  alt: `A${'CAG'.repeat((altIndex % 5) + 1)}${altIndex % 2 ? 'CCG' : 'CAA'}`,
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
    represented_allele_length_min: 140,
    represented_allele_length_max: 212,
    represented_allele_length_unavailable_reason: null,
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
        'Observed sequence tokens cannot be assigned to coordinate-defined LR reference components',
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
      'Compound loci lack an admitted mapping from whole-record sequence to LR reference components',
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
    short_read_context: {
      status: 'EXACT_UNIQUE' as const,
      reason_code: null,
      catalog_dataset: 'gnomad_r4',
      catalog_source: 'gnomad-v4-known-str-catalog',
      catalog_digest: 'catalog-test-digest',
      catalog_record: {
        id: 'HTT',
        gene: { ensembl_id: 'ENSG00000197386', symbol: 'HTT', region: 'exon' },
        associated_diseases: [
          {
            name: 'Huntington disease',
            symbol: 'HD',
            omim_id: '143100',
            inheritance_mode: 'Autosomal dominant',
            repeat_size_classifications: [
              { classification: 'Normal', min: null, max: 26 },
              { classification: 'Intermediate', min: 27, max: 35 },
              { classification: 'Pathogenic', min: 36, max: null },
            ],
            notes: 'Catalog note copied verbatim.',
          },
        ],
        stripy_id: 'HTT',
        strchive_id: 'HTT',
        main_reference_region: {
          reference_genome: 'GRCh38',
          chrom: '4',
          start: 3074876,
          stop: 3074933,
        },
        reference_regions: [
          {
            reference_genome: 'GRCh38',
            chrom: '4',
            start: 3074876,
            stop: 3074933,
          },
        ],
        reference_repeat_unit: 'CAG',
        repeat_units: [
          { repeat_unit: 'CAG', classification: 'pathogenic' },
          { repeat_unit: 'CAA', classification: 'reference' },
        ],
      },
      matched_component_index: 0,
      matched_component: components[0],
      matched_reference_region_index: 0,
      exact_reference_component_outline_authorized: true,
      matched_reference_repeat_unit_classifications: ['pathogenic'],
      lr_database: 'gnomad_lr_y1_full_genome',
      lr_release: 'y1',
      lr_run_id: 'run-hgsvc',
      lr_cohort: 'hgsvc_hprc' as const,
    },
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
      interaction: {
        interaction_status: 'UNAVAILABLE_PLOTS' as const,
        reason: 'Repeat-count plots and contributor interaction are unavailable.',
      },
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
    interaction: {
      interaction_status: 'UNAVAILABLE_SOURCE_IDENTITIES' as const,
      reason: 'Aggregate histogram source has no exact contributor identities.',
    },
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
        requestedCohort={locus?.lr_cohort || 'hgsvc_hprc'}
        selectedAllele={selectedAllele}
        onCohortChange={onCohortChange}
        onInvalidSelection={onInvalidSelection}
        navigation={navigation}
      />
    </ThemeProvider>
  )

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView
const originalWindowScrollTo = window.scrollTo
const scrollIntoView = jest.fn()
const windowScrollTo = jest.fn()
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: windowScrollTo })
})
afterAll(() => {
  if (originalScrollIntoView)
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    })
  Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalWindowScrollTo })
})
beforeEach(() => {
  navigation.onSelectAllele.mockClear()
  scrollIntoView.mockClear()
  windowScrollTo.mockClear()
  delete (global as any).__EXPERIMENTAL_FEATURES_ENABLED__
  delete (global as any).__TR_QUERY_STATE__
  delete (global as any).__TR_QUERY_PROPS__
  window.history.replaceState(null, '', '/')
})

describe('canonical long-read tandem-repeat locus page', () => {
  test('hides local haplotype backgrounds unless their experimental feature is enabled', () => {
    renderPage()

    expect(screen.queryByLabelText('Experimental local haplotype backgrounds')).toBeNull()
  })

  test('allows selective URL opt-in to local haplotype backgrounds', () => {
    window.history.replaceState(null, '', '/?experimental_features=tr_haplotype_backgrounds')

    renderPage()

    expect(screen.getByLabelText('Experimental local haplotype backgrounds')).not.toBeNull()
  })

  test('renders grounded source attributes and ordered overlapping components', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'HTT CAG / CAA / CCG / CCT / GCC tandem repeat' })
    ).not.toBeNull()
    expect(screen.getByText('chr4:3,074,877–3,075,040 (GRCh38)')).not.toBeNull()
    expect(screen.queryByText('Long-read tandem repeat')).toBeNull()
    expect(screen.queryByText('GRCh38 / hg38')).toBeNull()
    expect(screen.getByText('72 exact ALT sequences')).not.toBeNull()
    expect(screen.getByText('140–212 bp (−24 to +48 bp)')).not.toBeNull()
    expect(screen.getByText('HTT — exon')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'TRExplorer' })).not.toBeNull()
    expect(screen.getAllByText(sourceVariantId, { selector: 'code' }).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('img', {
        name: /6 ordered LR reference components in 2 coordinate lanes/,
      })
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

  test('uses motif identity rather than an interval as the anonymous-locus title', () => {
    const locus = makeSimpleLocus()
    ;(locus as any).short_read_context = {
      ...locus.short_read_context,
      status: 'NONE',
      catalog_record: null,
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'CAG tandem repeat' })).not.toBeNull()
    expect(screen.getByText('chr4:3,074,877–3,074,933 (GRCh38)')).not.toBeNull()
    expect(screen.queryByText('HTT — exon')).toBeNull()
  })

  test('gives every canonical page help dialog the task-first structure', () => {
    renderPage()
    const helpTitles = [
      'About this tandem-repeat locus',
      'About LR reference components',
      'About short-read known-locus context',
      'About the short-read reference cohort',
      'About the allelic landscape',
      'About the exact allele index',
      'About exact allele details',
      'About unavailable data',
    ]

    const firstHelpButton = screen.getByRole('button', { name: helpTitles[0] })
    expect(firstHelpButton).toHaveStyleRule('min-width', '44px')
    expect(firstHelpButton).toHaveStyleRule('min-height', '44px')

    helpTitles.forEach((title) => {
      fireEvent.click(screen.getByRole('button', { name: title }))
      const dialog = screen.getByRole('dialog', { name: title })
      expect(within(dialog).getByText('What this shows.')).not.toBeNull()
      expect(within(dialog).getByText('How to use it.')).not.toBeNull()
      expect(within(dialog).getByText('What it does not show.')).not.toBeNull()
    })
  })

  test('uses the shared motif palette for ordered vocabulary badges and components', () => {
    renderPage()
    const expectedMotifs = ['CAG', 'CAA', 'CCG', 'CCT', 'GCC']
    const badges = screen.getByLabelText(`Repeat motifs: ${expectedMotifs.join(', ')}`)

    expect(
      within(badges)
        .getAllByText(/^(CAG|CAA|CCG|CCT|GCC)$/)
        .map((badge) => badge.textContent)
    ).toEqual(expectedMotifs)
    expectedMotifs.forEach((motif) => {
      const badge = within(badges).getByText(motif)
      const component = document.querySelector(`[data-component-motif="${motif}"]`)
      expect(component).not.toBeNull()
      expect(badge.getAttribute('data-motif-color')).toBe(component?.getAttribute('fill'))
      expect(badge.getAttribute('style')).toMatch(/background-color: rgb\(/)
      expect(badge.getAttribute('style')).toMatch(/color: (rgb\(17, 17, 17\)|rgb\(255, 255, 255\))/)
    })
    expect(screen.queryByLabelText('Repeat motif color legend')).toBeNull()
  })

  test('states compound measurement limits and signed total-length semantics', () => {
    renderPage()
    expect(
      screen.getByText(/compound loci do not have one unambiguous component repeat count/)
    ).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'About the allelic landscape' }))
    const help = screen.getByRole('dialog', { name: 'About the allelic landscape' })
    expect(within(help).getByText('Allele repeat-count distribution')).not.toBeNull()
    expect(within(help).getByText('Genotype repeat-count distribution')).not.toBeNull()
    expect(within(help).getByText('Total allele length change (ALT − REF, bp)')).not.toBeNull()
    expect(within(help).getByText('Length change × motif purity')).not.toBeNull()
    expect(within(help).getByText('Genotype length distribution')).not.toBeNull()
    expect(within(help).getByText(/Selecting an exact allele.*only action/s)).not.toBeNull()
    expect(within(help).getByText(/do not classify an LR allele/)).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Measurement availability' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Data availability' })).toBeNull()
    expect(
      screen.getByRole('button', { name: /−6 bp, 134 called allele copies.*2 exact alleles/ })
    ).not.toBeNull()
    expect(screen.getByRole('button', { name: /\+48 bp, 5 called allele copies/ })).not.toBeNull()
  })

  test('deprioritizes a single reference component in a closed disclosure', () => {
    renderPage({ locus: makeSimpleLocus(), selectedAllele: undefined })

    const disclosure = screen.getByText(/LR reference component: CAG · chr4:/).closest('details')
    expect(disclosure).not.toBeNull()
    expect(disclosure?.hasAttribute('open')).toBe(false)
    expect(screen.getByText('Repeat motif')).not.toBeNull()
  })

  test('renders an explicit non-error state when a locus is absent from one cohort', () => {
    const onCohortChange = jest.fn()
    renderPage({ locus: null, selectedAllele: undefined, onCohortChange })

    expect(screen.getByRole('heading', { name: 'Tandem-repeat locus unavailable' })).not.toBeNull()
    expect(screen.getByRole('status').textContent).toContain(
      'This exact canonical locus is not available in the HGSVC / HPRC data. Data from another cohort were not substituted.'
    )
    fireEvent.change(screen.getByLabelText('Long-read cohort'), { target: { value: 'aou' } })
    expect(onCohortChange).toHaveBeenCalledWith('aou')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  test('uses one spacious responsive 2 × 2 grid for the four actually admitted simple plots', () => {
    renderPage({ locus: makeSimpleLocus(), selectedAllele: undefined })

    const grid = screen.getByTestId('whole-record-allele-plot-grid')
    const headings = within(grid).getAllByRole('heading', { level: 3 })

    expect(headings.map((heading) => heading.textContent)).toEqual([
      expect.stringContaining('Allele repeat-count distribution'),
      expect.stringContaining('Genotype repeat-count distribution'),
      'Total allele length change (ALT − REF, bp)',
      'Length change × motif purity',
    ])
    expect(grid.getAttribute('data-plot-count')).toBe('4')
    expect(grid.querySelectorAll(':scope > [data-plot-card]')).toHaveLength(4)
    expect(within(grid).getByTestId('allele-repeat-count-plot')).not.toBeNull()
    expect(within(grid).getByTestId('genotype-repeat-count-plot')).not.toBeNull()
    expect(
      screen.getByTestId('allele-repeat-count-card').getAttribute('data-interaction-status')
    ).toBe('UNAVAILABLE_SOURCE_IDENTITIES')
    expect(
      screen.getByTestId('genotype-repeat-count-card').getAttribute('data-interaction-status')
    ).toBe('UNAVAILABLE_SOURCE_IDENTITIES')
    expect(screen.queryByRole('heading', { name: 'Simple-locus repeat counts' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'More information' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'About the allelic landscape' }))
    const help = screen.getByRole('dialog', { name: 'About the allelic landscape' })
    expect(
      within(help).getByText(/bars remain static because exact contributors are not available/)
    ).not.toBeNull()
    expect(
      within(help).getByText(/squares remain static because exact allele pairs are not available/)
    ).not.toBeNull()
    expect(within(grid).queryByRole('heading', { name: 'Genotype length distribution' })).toBeNull()
    expect(grid).toHaveStyleRule('grid-template-columns', 'repeat( 2,minmax(280px,1fr) )')
    expect(grid).toHaveStyleRule('gap', 'clamp(24px,2vw,32px)')
    expect(grid).toHaveStyleRule('grid-template-columns', 'repeat(2,minmax(280px,1fr))', {
      media: '(max-width:1199px)',
    })
    expect(grid).toHaveStyleRule('grid-template-columns', 'minmax(280px,1fr)', {
      media: '(max-width:700px)',
    })
    expect(grid.compareDocumentPosition(screen.getByTestId('lr-tr-exact-allele-browser'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  test('renders one responsive allele table with selected detail immediately below it', () => {
    renderPage()
    const landscape = screen.getByRole('heading', { name: 'Allelic landscape' }).closest('section')
    const browser = screen.getByTestId('lr-tr-exact-allele-browser')
    const alleleTables = screen.getAllByRole('table', { name: 'Exact allele index' })
    const index = alleleTables[0]
    const selectedDetail = screen.getByTestId('lr-tr-selected-detail')
    const plotGrid = screen.getByTestId('whole-record-allele-plot-grid')
    const genotypeCard = screen.getByTestId('genotype-length-card')
    const genotypeDetail = screen.getByTestId('genotype-pair-detail')

    expect(alleleTables).toHaveLength(1)
    expect(screen.queryByRole('table', { name: /Exact alleles at/ })).toBeNull()
    expect(landscape?.contains(browser)).toBe(true)
    expect(browser.contains(index)).toBe(true)
    expect(browser.contains(selectedDetail)).toBe(true)
    expect(
      within(plotGrid)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual([
      'Total allele length change (ALT − REF, bp)',
      'Length change × motif purity',
      'Genotype length distribution',
    ])
    expect(plotGrid.compareDocumentPosition(index)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(genotypeCard.compareDocumentPosition(genotypeDetail)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(genotypeDetail.compareDocumentPosition(index)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(plotGrid.getAttribute('data-plot-count')).toBe('3')
    expect(plotGrid.querySelectorAll(':scope > [data-plot-card]')).toHaveLength(3)
    expect(plotGrid).toHaveStyleRule('grid-template-columns', 'repeat( 3,minmax(280px,1fr) )')
    expect(plotGrid).toHaveStyleRule('gap', 'clamp(24px,2vw,32px)')
    expect(plotGrid).toHaveStyleRule('grid-template-columns', 'repeat(2,minmax(280px,1fr))', {
      media: '(max-width:1199px)',
    })
    expect(plotGrid).toHaveStyleRule('grid-template-columns', 'minmax(280px,1fr)', {
      media: '(max-width:700px)',
    })
    expect(browser).toHaveStyleRule('grid-template-columns', 'minmax(0,100%)')
    expect(index).toHaveStyleRule('overflow-x', 'hidden')
    const indexHeader = within(index).getAllByRole('row')[0]
    expect(indexHeader).toHaveStyleRule('grid-template-columns', 'minmax(145px, 1fr) 60px 70px', {
      media: '(max-width:420px)',
    })
    expect(indexHeader).toHaveStyleRule('column-gap', '0.4em', {
      media: '(max-width:420px)',
    })
    const componentScroller = screen.getByRole('region', {
      name: 'Scrollable LR reference component track',
    })
    expect(componentScroller.getAttribute('tabindex')).toBe('0')
  })

  test('renders complete non-classifying short-read context with a fixed dataset link', () => {
    renderPage()
    const panel = screen
      .getByRole('heading', { name: /Short-read known-locus context/ })
      .closest('section') as HTMLElement
    expect(
      within(panel).getByRole('link', { name: 'HTT (HTT) short-read details' }).getAttribute('href')
    ).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')
    expect(within(panel).getByText('Huntington disease (HD)')).not.toBeNull()
    expect(within(panel).getByText('143100')).not.toBeNull()
    expect(within(panel).getByText('Autosomal dominant')).not.toBeNull()
    expect(
      within(panel).getByText(/Normal ≤ 26, Intermediate 27 - 35, Pathogenic ≥ 36/)
    ).not.toBeNull()
    expect(within(panel).getByText('Catalog note copied verbatim.')).not.toBeNull()
    expect(within(panel).getAllByText(/CAG/).length).toBeGreaterThan(0)
    expect(within(panel).getByText(/Short-read reference context only/)).not.toBeNull()
    expect(within(panel).getByText(/do not classify any LR allele/)).not.toBeNull()
    const shortCohort = screen
      .getByRole('heading', { name: 'Short-read reference cohort — HTT CAG' })
      .closest('section') as HTMLElement
    const landscape = screen.getByRole('heading', { name: 'Allelic landscape' }).closest('section')!
    expect(panel.compareDocumentPosition(shortCohort)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(shortCohort.compareDocumentPosition(landscape)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      within(shortCohort).getByRole('button', { name: 'Load short-read distributions' })
    ).not.toBeNull()
    expect(within(shortCohort).getByText(/Green short-read repeat-count plots/)).not.toBeNull()
    fireEvent.click(
      within(shortCohort).getByRole('button', {
        name: 'About the short-read reference cohort',
      })
    )
    const shortHelp = screen.getByRole('dialog', {
      name: 'About the short-read reference cohort',
    })
    expect(
      within(shortHelp).getByText('Short-read allele repeat-count distribution')
    ).not.toBeNull()
    expect(
      within(shortHelp).getByText('Short-read genotype repeat-count distribution')
    ).not.toBeNull()
    expect(
      within(shortHelp).getByText(/do not filter, select, or classify LR observations/)
    ).not.toBeNull()
    expect(screen.queryByText(/Outlined component 1:/)).toBeNull()
    const highlightedComponent = screen
      .getByRole('img', { name: /component 1 has a neutral dotted outline/ })
      .querySelector('[data-exact-reference-component-match="true"]')
    expect(highlightedComponent).not.toBeNull()
  })

  test.each([
    'NONE',
    'MULTIPLE',
    'AMBIGUOUS_CATALOG',
    'AMBIGUOUS_COMPONENT',
    'CATALOG_UNAVAILABLE',
    'UNAVAILABLE',
  ])('does not render short-read clinical context for %s', (status) => {
    const locus = makeLocus()
    locus.short_read_context = {
      ...locus.short_read_context,
      status: status as any,
      catalog_record: null,
      matched_component_index: null,
      matched_component: null,
      exact_reference_component_outline_authorized: false,
      matched_reference_repeat_unit_classifications: [],
    } as any
    renderPage({ locus })
    expect(screen.queryByRole('heading', { name: /Short-read known-locus context/ })).toBeNull()
    expect(screen.queryByRole('heading', { name: /Short-read reference cohort/ })).toBeNull()
    expect(screen.queryByText(/Short-read known-locus ranges are reference context/)).toBeNull()
    expect(screen.queryByText(/Outlined component/)).toBeNull()
  })

  test('filters the primary index to every same-length identity and clears back to all', () => {
    renderPage()
    const table = screen.getByRole('table', { name: 'Exact allele index' })
    const allAllelesHeading = screen.getByRole('heading', {
      name: '72 of 72 exact alleles',
    })
    expect(allAllelesHeading).not.toBeNull()
    expect(allAllelesHeading.closest('header')).toHaveStyleRule('flex-wrap', 'wrap')
    expect(table.getAttribute('aria-rowcount')).toBe('73')

    fireEvent.click(screen.getByRole('button', { name: /−6 bp, 134 called allele copies/ }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '2 of 72 exact alleles at −6 bp' })
    )
    expect(table.getAttribute('aria-rowcount')).toBe('3')
    expect(within(table).getByText(`${sourceVariantId}~2`)).not.toBeNull()
    expect(within(table).getByText(`${sourceVariantId}~3`)).not.toBeNull()
    expect(screen.getAllByRole('table', { name: 'Exact allele index' })).toHaveLength(1)
    expect(screen.queryByRole('table', { name: /Exact alleles at/ })).toBeNull()

    const selectedControl = within(table).getByRole('link', { name: 'Selected ALT 2' })
    const otherControl = within(table).getByRole('link', { name: 'Select ALT 3' })
    expect(selectedControl.getAttribute('aria-current')).toBe('page')
    expect(otherControl.getAttribute('aria-current')).toBeNull()
    expect(selectedControl.closest('[role="row"]')?.getAttribute('aria-selected')).toBeNull()
    expect(fireEvent.click(otherControl)).toBe(false)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(`${sourceVariantId}~3`)

    fireEvent.click(screen.getByRole('button', { name: 'Show all exact alleles' }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '72 of 72 exact alleles' })
    )
    expect(table.getAttribute('aria-rowcount')).toBe('73')
  })

  test('links purity and exact detail and preserves source decomposition caveat', () => {
    renderPage()
    const detail = screen.getByTestId('lr-tr-selected-detail')
    expect(detail).toBe(document.activeElement)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(within(detail).getByText(exactId)).not.toBeNull()
    expect(within(detail).getByText(/source_ap_allele/)).not.toBeNull()
    expect(
      within(detail).getByText(/do not represent the LR reference component coordinates/)
    ).not.toBeNull()
    expect(within(detail).getByLabelText('Selected ALT motif structure grid')).not.toBeNull()
    expect(screen.getByTestId('selected-motif-structure-boundaries')).toHaveStyleRule(
      'stroke',
      '#36454f!important',
      { modifier: "& [aria-label='Selected ALT motif structure grid'] svg rect[stroke='white']" }
    )
    expect(screen.getByTestId('selected-motif-structure-boundaries')).toHaveStyleRule(
      'stroke-width',
      '1px!important',
      { modifier: "& [aria-label='Selected ALT motif structure grid'] svg rect[stroke='white']" }
    )
    expect(
      screen.getByRole('group', {
        name: /exact alleles plotted by total allele length change and motif purity/,
      })
    ).not.toBeNull()
  })

  test('uses materially different point areas for heterogeneous exact-allele AC', () => {
    renderPage()
    const lowAcPoint = screen.getByRole('button', { name: /ALT 1.+40 called copies/ })
    const highAcPoint = screen.getByRole('button', { name: /ALT 2.+120 called copies/ })
    const lowDiameter = Number(lowAcPoint.getAttribute('data-point-diameter'))
    const highDiameter = Number(highAcPoint.getAttribute('data-point-diameter'))

    expect(highDiameter ** 2 / lowDiameter ** 2).toBeGreaterThan(4)
    expect(purityPointDiameter(12, 12, 12)).toBe(16)
    expect(highAcPoint.getAttribute('data-selected-allele')).toBe('true')
    expect(highAcPoint).toHaveStyleRule('box-sizing', 'border-box')
    expect(
      screen.getByLabelText('Point size represents exact allele AC from 40 to 120')
    ).not.toBeNull()
  })

  test('distinguishes reference identity from a zero-delta exact ALT in genotype pair detail', () => {
    renderPage()
    expect(
      screen.getByText(
        (_text, element) =>
          Boolean(
            element?.textContent?.includes(
              'Reference (0 bp) remains distinct from an exact allele with 0 bp length change'
            )
          ),
        { selector: 'p' }
      )
    ).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'ALT 1' }).length).toBeGreaterThan(0)
    const zeroDeltaCell = screen.getByRole('button', {
      name: /0 bp longer, 0 bp shorter: 20 people; filter the exact allele index/,
    })
    expect(zeroDeltaCell).not.toBeNull()
    expect(zeroDeltaCell.closest('svg')?.getAttribute('role')).toBe('group')

    fireEvent.click(zeroDeltaCell)
    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        name: '1 of 72 exact alleles in selected genotype cell (0 bp × 0 bp)',
      })
    )
    expect(
      screen.getByRole('table', { name: 'Exact allele index' }).getAttribute('aria-rowcount')
    ).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Show all exact alleles' }))
    expect(screen.getByRole('heading', { name: '72 of 72 exact alleles' })).toBe(
      document.activeElement
    )
  })

  test.each([72, 497])('shows all %s exact alleles in the primary virtualized browser', (count) => {
    renderPage({ locus: makeLocus(count), selectedAllele: undefined })
    const heading = screen.getByRole('heading', { name: `${count} of ${count} exact alleles` })
    const section = heading.closest('section')
    expect(section).not.toBeNull()
    expect(heading.closest('details')).toBeNull()
    const virtualIndex = within(section as HTMLElement).getByTestId('virtual-exact-index')
    expect(virtualIndex.getAttribute('data-item-count')).toBe(String(count))
    expect(virtualIndex.getAttribute('data-height')).toBe('312')
    expect(virtualIndex.classList.contains('lr-tr-exact-index-scroll')).toBe(true)
    const finalRow = screen.getByTitle(`${sourceVariantId}~${count}`)
    expect(finalRow.getAttribute('aria-rowindex')).toBe(String(count + 1))
    expect(within(finalRow).getByText(`${sourceVariantId}~${count}`)).not.toBeNull()
    expect(within(finalRow).getByRole('link', { name: `Select ALT ${count}` })).not.toBeNull()
    expect(
      within(finalRow).getByRole('img', { name: `ALT ${count} motif structure preview` })
    ).not.toBeNull()
    expect(finalRow.getAttribute('aria-label')).toMatch(
      new RegExp(
        `ALT ${count}; ${sourceVariantId}~${count}; total allele length change .+; purity .+; AC .+; AF .+`
      )
    )
    expect(
      screen.getByRole('table', { name: 'Exact allele index' }).getAttribute('aria-rowcount')
    ).toBe(String(count + 1))
  })

  test('shows the complete allele identity and formats AC as an integer count', () => {
    const locus = makeLocus()
    locus.alleles.nodes[0].freq.all.ac = 20.00342
    renderPage({ locus, selectedAllele: undefined })
    const row = screen.getByTitle(`${sourceVariantId}~1`)
    expect(within(row).getByText(`${sourceVariantId}~1`)).not.toBeNull()
    expect(within(row).getByText('20')).not.toBeNull()
    expect(within(row).queryByText('20.00342')).toBeNull()

    const table = screen.getByRole('table', { name: 'Exact allele index' })
    const acSort = within(table).getByRole('button', { name: 'AC' })
    fireEvent.click(acSort)
    expect(screen.getByTitle(`${sourceVariantId}~2`).getAttribute('aria-rowindex')).toBe('2')
    expect(acSort.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(acSort)
    expect(screen.getByTitle(`${sourceVariantId}~3`).getAttribute('aria-rowindex')).toBe('2')
    expect(acSort.closest('[role="columnheader"]')?.getAttribute('aria-sort')).toBe('ascending')
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
        /Exact allele details unavailable: the selected allele sequence is too large to display safely/
      )
    ).not.toBeNull()
    expect(screen.queryByText(/Selected allele sequence and details:/)).toBeNull()
  })

  test('scopes cumulative index bounds separately from available selected detail', () => {
    renderPage({
      locus: {
        ...makeLocus(),
        sequences_available: false,
        sequences_unavailable_reason: 'ALLELE_INDEX_SEQUENCE_BYTE_BOUND_EXCEEDED',
        alleles: {
          ...makeLocus().alleles,
          nodes: makeLocus().alleles.nodes.map((allele) => ({ ...allele, ref: null, alt: null })),
        },
      },
      selectedAllele: exactId,
    })

    expect(screen.getByRole('heading', { name: `${exactId} exact allele details` })).not.toBeNull()
    expect(
      screen.getByText(
        /Motif previews are unavailable because the allele sequences are too large to preview safely/
      )
    ).not.toBeNull()
    expect(screen.queryByText(/Allele motif previews:/)).toBeNull()
    expect(screen.queryByText(/^Exact ALT sequences:/)).toBeNull()
  })

  test('cohort selection delegates push/clear semantics to the container', () => {
    const onCohortChange = jest.fn()
    renderPage({ onCohortChange })
    fireEvent.change(screen.getByLabelText('Long-read cohort'), { target: { value: 'aou' } })
    expect(onCohortChange).toHaveBeenCalledWith('aou')
  })

  test('keeps source provenance compact and accessible', () => {
    renderPage()
    const provenance = screen.getByText('Data source details').closest('details')
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
      screen.getByText(/Total allele length change plot unavailable: the result is too large/)
    ).not.toBeNull()
    expect(
      screen.getByText(
        /Genotype landscape unavailable: the source does not include the required metadata/
      )
    ).not.toBeNull()
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
    expect((global as any).__TR_QUERY_PROPS__.rejectGraphQLErrors).toBe(true)
    expect((global as any).__TR_QUERY_PROPS__.requestKey).toBe(`hgsvc_hprc:${staleLocus.id}`)
    expect(screen.getByRole('heading', { name: `${exactId} exact allele details` })).not.toBeNull()
    expect(screen.getByRole('heading', { name: '72 of 72 exact alleles' })).not.toBeNull()
    expect(
      within(screen.getByRole('table', { name: 'Exact allele index' }))
        .getByRole('link', { name: 'Selected ALT 1' })
        .getAttribute('aria-current')
    ).toBe('page')
    ;(global as any).__TR_QUERY_STATE__ = {
      data: { long_read_tandem_repeat_locus: freshLocus },
      requestVariables: { allele: nextAlleleId },
      stale: false,
    }
    rendered.rerender(React.cloneElement(page))

    expect(
      screen.getByRole('heading', { name: `${nextAlleleId} exact allele details` })
    ).not.toBeNull()
    expect(screen.getByTestId('lr-tr-selected-detail')).not.toBe(document.activeElement)
    expect(scrollIntoView).not.toHaveBeenCalled()
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
    fireEvent.click(
      within(screen.getByRole('table', { name: 'Exact allele index' })).getByRole('link', {
        name: 'Select ALT 2',
      })
    )
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
    expect(longReadTandemRepeatLocusQuery).toContain('represented_allele_length_min')
    expect(longReadTandemRepeatLocusQuery).toContain('whole_record_genotype_landscape')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele_unavailable_reason')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele {')
    expect(longReadTandemRepeatLocusQuery).toContain('ref alt length')
    expect(longReadTandemRepeatLocusQuery).toContain('source_records {')
    expect(longReadTandemRepeatLocusQuery).toContain('repeat_count_plots')
    expect(longReadTandemRepeatLocusQuery).toContain('interaction { interaction_status reason }')
    expect(longReadTandemRepeatLocusQuery).toContain('short_read_context {')
    expect(longReadTandemRepeatLocusQuery).toContain('exact_reference_component_outline_authorized')
    expect(longReadTandemRepeatLocusQuery).toContain(
      'matched_reference_repeat_unit_classifications'
    )
    expect(longReadTandemRepeatLocusQuery).not.toContain('pathogenic_component_highlight')
    expect(longReadTandemRepeatLocusQuery).toContain('associated_diseases {')
    expect(longReadTandemRepeatLocusQuery).not.toContain('short_read_matches')
    expect(longReadTandemRepeatLocusQuery).not.toContain('$after')
  })
})
