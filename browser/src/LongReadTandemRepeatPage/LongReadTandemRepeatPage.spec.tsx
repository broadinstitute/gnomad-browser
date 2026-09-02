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
    accepted_task_attempt_digest: 'a'.repeat(64),
    presentation: {
      source_representation_kind: 'UNKNOWN' as const,
      presentation_layout: 'REPEAT_FOCUSED' as const,
      presentation_reason: 'REVIEWED_PRIMARY_REPEAT' as const,
      classification_source: null,
      classification_release: null,
      classification_digest: null,
      reviewed_override_digest: 'b'.repeat(64),
    },
    bounds: {
      component_envelope_start0: 3074876,
      component_envelope_end0: 3075040,
      component_envelope_length_bp: 164,
      component_envelope_basis: 'EXACT_ORDERED_COMPONENTS' as const,
      source_ref_span_start0: null,
      source_ref_span_end0: null,
      source_ref_span_status: 'UNAVAILABLE_NO_APPROVED_COORDINATE_CONTRACT' as const,
      variation_cluster_start0: null,
      variation_cluster_end0: null,
      variation_cluster_length_bp: null,
      variation_cluster_status: 'UNAVAILABLE_NO_APPROVED_CLASSIFICATION' as const,
      bounds_source: null,
      bounds_release: null,
      bounds_digest: null,
    },
    component_summary: {
      ordered_component_count: 6,
      distinct_stored_motif_count: 5,
    },
    sequence_cardinality: {
      source_alt_identity_count: count,
      unique_alt_sequence_count: count,
      all_source_alts_sequence_complete: true,
      status: 'AVAILABLE_EXACT' as const,
      reason: null,
      algorithm_version: 'ALT_BYTES_SHA256_THEN_EXACT_V1',
    },
    represented_length: {
      status: 'AVAILABLE_EXACT' as const,
      reason: null,
      represented_ref_length_bp: 164,
      represented_alt_min_length_bp: 140,
      represented_alt_max_length_bp: 212,
      source_delta_provenance: 'INFO_ALLELE_LENGTH' as const,
      sequence_length_provenance: 'EXACT_SOURCE_REF_ALT_BYTES_V1',
      sequence_source_record_digest: 'c'.repeat(64),
      sequence_content_digest: 'd'.repeat(64),
      anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1' as const,
      anchor_rule_source: 'approved-test-receipt',
      anchor_rule_release: 'test-v1',
      anchor_rule_digest: 'e'.repeat(64),
      reconciliation_status: 'RECONCILED' as const,
    },
    filter_contract: {
      status: 'PARTIAL' as const,
      reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
      ancestry_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL' as const,
      sex_mapping_status: 'UNAVAILABLE_PENDING_OWNER_APPROVAL' as const,
      ancestry_groups: [
        {
          id: 'frequency:afr',
          label: 'afr (source frequency key)',
          kind: 'SOURCE_GROUP' as const,
          source_frequency_keys: ['afr'],
          source_metadata_keys: [],
          available_in_frequency: true,
          available_in_genotype: false,
          shared_available: false,
          unavailable_reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
        },
        {
          id: 'metadata:EUR',
          label: 'EUR (source metadata key)',
          kind: 'SOURCE_GROUP' as const,
          source_frequency_keys: [],
          source_metadata_keys: ['EUR'],
          available_in_frequency: false,
          available_in_genotype: true,
          shared_available: false,
          unavailable_reason: 'ANCESTRY_MAPPING_NOT_APPROVED',
        },
      ],
      sex_groups: [
        {
          id: 'frequency-sex:XX',
          label: 'XX (source frequency key)',
          kind: 'SOURCE_GROUP' as const,
          source_frequency_keys: ['XX'],
          source_metadata_keys: [],
          available_in_frequency: true,
          available_in_genotype: false,
          shared_available: false,
          unavailable_reason: 'SEX_MAPPING_NOT_APPROVED',
        },
      ],
      ancestry_control_redundant: false,
      ancestry_control_redundancy_reason: 'NOT_SOLE_ANCESTRY_STRATUM',
      available_color_dimensions: [],
      allele_color_dimensions: ['ANCESTRY' as const, 'SEX' as const],
      genotype_color_dimensions: ['ANCESTRY' as const, 'SEX' as const],
      unstratified_policy:
        'EXPLICIT_SOURCE_UNKNOWN_SEPARATE_AND_FAIL_CLOSED_WITHOUT_COMPATIBLE_DENOMINATORS',
      vocabulary_release: null,
      vocabulary_digest: null,
      source_key_inventory_release: 'source-keys-v1',
      source_key_inventory_digest: 'f'.repeat(64),
      source_release: 'y1',
      source_run_id: 'run-hgsvc',
      metadata_source_run_id: 'metadata-run',
    },
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
    primary_repeat: {
      status: 'AVAILABLE' as const,
      reason_code: null,
      motif: 'CAG',
      component_index: 0,
      component: components[0],
      selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT' as const,
      biological_role: null,
      catalog_id: 'HTT',
      catalog_digest: 'catalog-test-digest',
      registry_digest: null,
    },
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
      },
      matched_component_index: 0,
      matched_component: components[0],
      matched_reference_region_index: 0,
      exact_reference_component_outline_authorized: true,
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
  presentation: {
    ...makeLocus().presentation,
    presentation_reason: 'SOLE_EXACT_COMPONENT' as const,
    reviewed_override_digest: null,
  },
  bounds: {
    ...makeLocus().bounds,
    component_envelope_end0: 3074933,
    component_envelope_length_bp: 57,
  },
  component_summary: { ordered_component_count: 1, distinct_stored_motif_count: 1 },
  component_measurement_available: true,
  component_measurement_unavailable_reason: null,
  components: [{ chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' }],
  primary_repeat: {
    ...makeLocus().primary_repeat,
    component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  },
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
    expect(screen.getByRole('heading', { name: 'HTT CAG tandem repeat' })).not.toBeNull()
    expect(screen.getByLabelText(/Primary repeat CAG/).textContent).toContain(
      'Primary repeat CAG · exact catalog / LR component 1'
    )
    expect(screen.getByText('Compound source representation · 6 components')).not.toBeNull()
    expect(screen.getByText('chr4:3,074,877–3,075,040 (GRCh38)')).not.toBeNull()
    expect(screen.queryByText('Long-read tandem repeat')).toBeNull()
    expect(screen.queryByText('GRCh38 / hg38')).toBeNull()
    expect(screen.getAllByText('72 source ALT alleles')).toHaveLength(1)
    expect(
      screen.getAllByText('140–212 bp represented (−24 to +48 bp versus REF)').length
    ).toBeGreaterThan(0)
    expect(screen.getByText('HTT — exon')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'TRExplorer' })).not.toBeNull()
    expect(screen.getAllByText(sourceVariantId, { selector: 'code' }).length).toBeGreaterThan(0)
    expect(
      screen.getByRole('img', {
        name: /6 ordered LR reference components in 2 coordinate lanes/,
      })
    ).not.toBeNull()
    fireEvent.click(screen.getByText('Full ordered component table (6)'))
    const finalComponentRow = screen.getByText('chr4:3,075,009–3,075,040').closest('tr')!
    expect(within(finalComponentRow).getByText('CCG')).not.toBeNull()
    expect(within(finalComponentRow).getByText('32 bp')).not.toBeNull()
    expect(componentLanes(components)).toEqual([0, 1, 0, 0, 0, 0])
  })

  test('uses motif identity rather than an interval as the anonymous-locus title', () => {
    const locus = makeSimpleLocus()
    ;(locus as any).short_read_context = {
      ...locus.short_read_context,
      status: 'NONE',
      catalog_record: null,
    }
    ;(locus as any).primary_repeat = {
      ...locus.primary_repeat,
      selection_basis: 'LR_SOLE_COMPONENT',
      biological_role: null,
      catalog_id: null,
      catalog_digest: null,
      registry_digest: null,
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'CAG tandem repeat' })).not.toBeNull()
    expect(screen.getByText('chr4:3,074,877–3,074,933 (GRCh38)')).not.toBeNull()
    expect(screen.queryByText('HTT — exon')).toBeNull()
    expect(
      screen.queryByText('Exact short-read catalog reference match (identity only)')
    ).toBeNull()
    expect(document.querySelector('[data-exact-reference-component-match="true"]')).toBeNull()
    expect(
      screen
        .getByRole('img', { name: /1 ordered LR reference component/ })
        .getAttribute('aria-label')
    ).not.toMatch(/exact short-read catalog reference match/i)
  })

  test('preserves ATXN1 stored TGC orientation and RFC1 benign reference identity', () => {
    const atxn1 = makeSimpleLocus()
    const atxn1Component = { chrom: '6', start0: 16327633, end0: 16327723, motif: 'TGC' }
    Object.assign(atxn1, {
      id: '6-16327633-16327723-TGC',
      source_trid: '6-16327633-16327723-TGC',
      chrom: '6',
      region: { chrom: '6', start0: 16327633, end0: 16327723, size: 90 },
      motifs: ['TGC'],
      components: [atxn1Component],
      primary_repeat: {
        ...atxn1.primary_repeat,
        motif: 'TGC',
        component: atxn1Component,
        biological_role: null,
        catalog_id: 'ATXN1',
      },
      short_read_context: {
        ...atxn1.short_read_context,
        catalog_record: {
          ...atxn1.short_read_context.catalog_record,
          id: 'ATXN1',
          gene: { ensembl_id: 'ENSG00000124788', symbol: 'ATXN1', region: 'coding' },
          associated_diseases: [
            {
              name: 'Spinocerebellar ataxia 1',
              symbol: 'SCA1',
              omim_id: '164400',
              inheritance_mode: 'Autosomal dominant',
              repeat_size_classifications: [
                { classification: 'Normal', min: null, max: 35 },
                { classification: 'Intermediate', min: 36, max: 38 },
                { classification: 'Pathogenic', min: 39, max: null },
              ],
              notes: 'ATXN1 catalog note.',
            },
          ],
          main_reference_region: {
            reference_genome: 'GRCh38',
            chrom: '6',
            start: 16327633,
            stop: 16327723,
          },
          reference_repeat_unit: 'TGC',
        },
        matched_component: atxn1Component,
      },
    })
    const rendered = renderPage({ locus: atxn1, selectedAllele: undefined })
    expect(screen.getByRole('heading', { name: 'ATXN1 TGC tandem repeat' })).not.toBeNull()
    expect(screen.getByLabelText('Primary repeat TGC').textContent).toBe(
      'Primary repeat TGC · exact catalog / LR component 1'
    )
    expect(screen.queryByRole('heading', { name: /ATXN1 CAG/ })).toBeNull()
    const atxn1Disease = screen.getByRole('rowheader', { name: 'Spinocerebellar ataxia 1' })
    expect(atxn1Disease.closest('tr')?.textContent).toContain('164400')
    expect(atxn1Disease.closest('tr')?.textContent).toContain(
      'Normal ≤ 35, Intermediate 36 - 38, Pathogenic ≥ 39'
    )
    expect(screen.queryByText('ATXN1 catalog note.')).toBeNull()

    rendered.unmount()
    const rfc1 = makeSimpleLocus()
    const rfc1Component = { chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' }
    Object.assign(rfc1, {
      id: '4-39348424-39348479-AAAAG',
      source_trid: '4-39348424-39348479-AAAAG',
      region: { chrom: '4', start0: 39348424, end0: 39348479, size: 55 },
      motifs: ['AAAAG'],
      components: [rfc1Component],
      primary_repeat: {
        ...rfc1.primary_repeat,
        motif: 'AAAAG',
        component: rfc1Component,
        biological_role: 'benign reference motif',
        catalog_id: 'RFC1',
      },
      short_read_context: {
        ...rfc1.short_read_context,
        catalog_record: {
          ...rfc1.short_read_context.catalog_record,
          id: 'RFC1',
          gene: { ensembl_id: 'ENSG00000133119', symbol: 'RFC1', region: 'intronic' },
          associated_diseases: [
            {
              name: 'Cerebellar ataxia, neuropathy, vestibular areflexia syndrome',
              symbol: 'CANVAS',
              omim_id: '614575',
              inheritance_mode: 'Autosomal recessive',
              repeat_size_classifications: [
                { classification: 'Normal', min: null, max: 11 },
                { classification: 'Pathogenic', min: 400, max: null },
              ],
              notes: 'RFC1 catalog note.',
            },
          ],
          main_reference_region: {
            reference_genome: 'GRCh38',
            chrom: '4',
            start: 39348424,
            stop: 39348479,
          },
          reference_repeat_unit: 'AAAAG',
        },
        matched_component: rfc1Component,
      },
    })
    renderPage({ locus: rfc1, selectedAllele: undefined })
    expect(screen.getByRole('heading', { name: 'RFC1 AAAAG tandem repeat' })).not.toBeNull()
    expect(screen.getByLabelText('Primary repeat AAAAG').textContent).toContain(
      'benign reference motif'
    )
    const rfc1Disease = screen.getByRole('rowheader', {
      name: 'Cerebellar ataxia, neuropathy, vestibular areflexia syndrome',
    })
    expect(rfc1Disease.closest('tr')?.textContent).toContain('614575')
    expect(rfc1Disease.closest('tr')?.textContent).toContain('Normal ≤ 11, Pathogenic ≥ 400')
    expect(screen.queryByText('RFC1 catalog note.')).toBeNull()
    expect(screen.queryByText('AAGGG', { exact: true })).toBeNull()
    expect(screen.queryByText('pathogenic', { exact: true })).toBeNull()
  })

  test('uses the neutral cluster fallback and keeps source truth closed', () => {
    const locus = makeLocus()
    ;(locus as any).presentation = {
      ...locus.presentation,
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'MULTI_COMPONENT_FALLBACK',
      reviewed_override_digest: null,
    }
    ;(locus as any).primary_repeat = {
      status: 'UNAVAILABLE',
      reason_code: 'REGISTRY_DIGEST_MISMATCH',
      motif: null,
      component_index: null,
      component: null,
      selection_basis: null,
      biological_role: null,
      catalog_id: null,
      catalog_digest: null,
      registry_digest: null,
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'Multi-component TR locus' })).not.toBeNull()
    expect(screen.queryByText(/Primary repeat unavailable/)).toBeNull()
    expect(screen.getByText('Locus component-envelope length')).not.toBeNull()
    const disclosure = screen
      .getByText('All ordered source components and provenance — 6 ordered components')
      .closest('details')
    expect(disclosure?.hasAttribute('open')).toBe(false)
    expect(screen.queryByRole('heading', { name: /Long-read exact CAG units/ })).toBeNull()
  })

  test('wraps long source motifs inside the bounded component disclosure', () => {
    const locus = makeLocus()
    const denseMotif = 'ATATATATATATATATATATATATCCAAGAGGAG'
    ;(locus as any).motifs = [denseMotif]
    ;(locus as any).components = locus.components.map((component) => ({
      ...component,
      motif: denseMotif,
    }))
    renderPage({ locus, selectedAllele: undefined })

    const disclosure = screen
      .getByText('All ordered source components and provenance — 6 ordered components')
      .closest('details') as HTMLElement
    fireEvent.click(within(disclosure).getByText(/All ordered source components and provenance/))
    const badge = disclosure.querySelector(`[data-motif-badge="${denseMotif}"]`) as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge).toHaveStyleRule('box-sizing', 'border-box')
    expect(badge).toHaveStyleRule('max-width', '100%')
    expect(badge).toHaveStyleRule('overflow-wrap', 'anywhere')
    expect(badge).toHaveStyleRule('word-break', 'break-word')
  })

  test('uses positive cluster wording and source bounds only with complete API provenance', () => {
    const locus = makeLocus()
    ;(locus as any).presentation = {
      source_representation_kind: 'VARIATION_CLUSTER',
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'SOURCE_VARIATION_CLUSTER',
      classification_source: 'source-catalog',
      classification_release: 'catalog-v1',
      classification_digest: '1'.repeat(64),
      reviewed_override_digest: null,
    }
    ;(locus as any).bounds = {
      ...locus.bounds,
      variation_cluster_start0: 3074800,
      variation_cluster_end0: 3075100,
      variation_cluster_length_bp: 300,
      variation_cluster_status: 'AVAILABLE_EXACT',
      bounds_source: 'source-catalog',
      bounds_release: 'catalog-v1',
      bounds_digest: '2'.repeat(64),
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'Variation cluster' })).not.toBeNull()
    expect(screen.getByText('Source variation-cluster length')).not.toBeNull()
    expect(screen.getByText('300 bp')).not.toBeNull()
    expect(screen.getByText(/chr4:3,074,801–3,075,100/)).not.toBeNull()
  })

  test('falls back to envelope bounds when a classified cluster lacks a bounds receipt', () => {
    const locus = makeLocus()
    ;(locus as any).presentation = {
      source_representation_kind: 'VARIATION_CLUSTER',
      presentation_layout: 'CLUSTER_FOCUSED',
      presentation_reason: 'SOURCE_VARIATION_CLUSTER',
      classification_source: 'source-catalog',
      classification_release: 'catalog-v1',
      classification_digest: '1'.repeat(64),
      reviewed_override_digest: null,
    }
    ;(locus as any).bounds = {
      ...locus.bounds,
      variation_cluster_start0: 3074800,
      variation_cluster_end0: 3075100,
      variation_cluster_length_bp: 300,
      variation_cluster_status: 'AVAILABLE_EXACT',
      bounds_source: 'source-catalog',
      bounds_release: 'catalog-v1',
      bounds_digest: null,
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'Variation cluster' })).not.toBeNull()
    expect(screen.getByText('Locus component-envelope length')).not.toBeNull()
    expect(screen.getByText('164 bp')).not.toBeNull()
    expect(screen.getByText(/chr4:3,074,877–3,075,040/)).not.toBeNull()
    expect(screen.queryByText('300 bp')).toBeNull()
  })

  test('falls back from an unreceipted reviewed compound presentation', () => {
    const locus = makeLocus()
    ;(locus as any).presentation = {
      ...locus.presentation,
      reviewed_override_digest: null,
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByRole('heading', { name: 'Multi-component TR locus' })).not.toBeNull()
    expect(screen.queryByText(/Compound source representation/)).toBeNull()
    expect(screen.getByText('Ordered source components')).not.toBeNull()
  })

  test('keeps duplicate source identities visible and fails length/filter gates closed', () => {
    const locus = makeLocus()
    ;(locus as any).sequence_cardinality = {
      ...locus.sequence_cardinality,
      source_alt_identity_count: 72,
      unique_alt_sequence_count: 71,
    }
    ;(locus as any).represented_length = {
      ...locus.represented_length,
      status: 'UNAVAILABLE',
      reason: 'STORED_DELTA_RECONCILIATION_MISMATCH',
      represented_ref_length_bp: null,
      represented_alt_min_length_bp: null,
      represented_alt_max_length_bp: null,
      reconciliation_status: 'MISMATCH',
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.getByText(/71 observed unique alternate sequences/).textContent).toContain(
      '72 source ALT identities'
    )
    const axis = screen.getByLabelText('Length axis') as HTMLSelectElement
    expect(
      (
        within(axis).getByRole('option', {
          name: 'Represented allele length',
        }) as HTMLOptionElement
      ).disabled
    ).toBe(true)
    expect(screen.queryByText(/nfe = EUR/)).toBeNull()
    expect((screen.getByLabelText('Genetic ancestry group') as HTMLSelectElement).disabled).toBe(
      true
    )
  })

  test('hides AoU ancestry controls only when API redundancy is certified', () => {
    const locus = makeLocus()
    ;(locus as any).lr_cohort = 'aou'
    ;(locus as any).filter_contract = {
      ...locus.filter_contract,
      ancestry_control_redundant: true,
      ancestry_control_redundancy_reason: 'CERTIFIED_EXACT_SOLE_STRATUM',
    }
    renderPage({ locus, selectedAllele: undefined })

    expect(screen.queryByLabelText('Genetic ancestry group')).toBeNull()
    expect(screen.getByText(/API certified the sole ancestry stratum as redundant/)).not.toBeNull()
    expect((screen.getByLabelText('Sex') as HTMLSelectElement).disabled).toBe(true)
  })

  test('gives every canonical page help dialog the task-first structure', () => {
    renderPage()
    const helpTitles = [
      'About this tandem-repeat locus',
      'About LR reference components',
      'About known disease-associated TR locus',
      'About the allelic landscape',
      'About the source-ALT index',
      'About exact ALT details',
      'About unavailable data',
    ]

    const firstHelpButton = screen.getByRole('button', { name: helpTitles[0] })
    expect(firstHelpButton).toHaveStyleRule('min-width', '44px')
    expect(firstHelpButton).toHaveStyleRule('min-height', '44px')

    helpTitles.forEach((title) => {
      fireEvent.click(screen.getByRole('button', { name: title }))
      const dialog = screen.getByRole('dialog', { name: title })
      if (title === 'About the allelic landscape') {
        expect(
          within(dialog).getByText(/These plots summarize long-read observations at this locus/)
        ).not.toBeNull()
      } else {
        expect(within(dialog).getByText('What this shows.')).not.toBeNull()
        expect(within(dialog).getByText('How to use it.')).not.toBeNull()
        expect(within(dialog).getByText('What it does not show.')).not.toBeNull()
      }
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
    expect(within(help).getByText('Repeat-count distributions (simple loci only)')).not.toBeNull()
    expect(within(help).getByText('Total allele length change (ALT − REF, bp)')).not.toBeNull()
    expect(within(help).getByText('Length change × motif purity')).not.toBeNull()
    expect(within(help).getByText('Genotype length distribution')).not.toBeNull()
    expect(within(help).getByText(/Only index row selection changes the URL/)).not.toBeNull()
    expect(
      within(help).getByText(/Color and y-scale controls affect only the total-length histogram/)
    ).not.toBeNull()
    expect(within(help).getByText(/Repeat-count controls are card-local/)).not.toBeNull()
    expect(
      within(help).getByText(
        /Purity is source-reported; the colored motif preview is a separate browser decomposition/
      )
    ).not.toBeNull()
    expect(within(help).getByText(/do not classify an LR allele/)).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Measurement availability' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Data availability' })).toBeNull()
    expect(
      screen.getByRole('button', {
        name: /−6 bp vs REF; 134 called non-reference allele copies.*2 source ALT alleles/,
      })
    ).not.toBeNull()
    expect(
      screen.getByRole('button', { name: /\+48 bp vs REF; 5 called non-reference allele copies/ })
    ).not.toBeNull()
  })

  test('keeps source components and exact provenance in one closed disclosure', () => {
    renderPage({ locus: makeSimpleLocus(), selectedAllele: undefined })

    const disclosure = screen
      .getByText('All ordered source components and provenance — 1 ordered component')
      .closest('details')
    expect(disclosure).not.toBeNull()
    expect(disclosure?.hasAttribute('open')).toBe(false)
    expect(within(disclosure as HTMLElement).getByText('Repeat motif')).not.toBeNull()
    expect(within(disclosure as HTMLElement).getByText('task', { selector: 'code' })).not.toBeNull()
    expect(
      within(disclosure as HTMLElement).getByText('attempt', { selector: 'code' })
    ).not.toBeNull()
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
      'Change from REF (bp)',
      'Change from REF × motif purity',
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
      within(help).getByText(
        /These marks are read-only when the source does not identify the contributing exact ALT sequences or allele pairs/
      )
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
    const alleleTables = screen.getAllByRole('table', { name: 'Source ALT allele index' })
    const index = alleleTables[0]
    const selectedDetail = screen.getByTestId('lr-tr-selected-detail')
    const plotGrid = screen.getByTestId('whole-record-allele-plot-grid')
    const genotypeCard = screen.getByTestId('genotype-length-card')
    const genotypeDetail = screen.getByTestId('genotype-pair-detail')

    expect(alleleTables).toHaveLength(1)
    expect(screen.queryByRole('table', { name: /Exact ALTs at/ })).toBeNull()
    expect(landscape?.contains(browser)).toBe(true)
    expect(browser.contains(index)).toBe(true)
    expect(browser.contains(selectedDetail)).toBe(true)
    expect(
      within(plotGrid)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual([
      'Change from REF (bp)',
      'Change from REF × motif purity',
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

  test('renders complete non-classifying disease context with a fixed dataset link', () => {
    renderPage()
    const section = screen
      .getByRole('heading', { name: /Known disease-associated TR locus/ })
      .closest('section') as HTMLElement
    const shortReadLink = within(section).getByRole('link', {
      name: 'View HTT in gnomAD short-read data',
    })
    expect(shortReadLink.getAttribute('href')).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')
    expect(within(section).getByRole('rowheader', { name: 'Huntington disease' })).not.toBeNull()
    expect(within(section).getByRole('link', { name: '143100' })).not.toBeNull()
    expect(within(section).getByText('Autosomal dominant')).not.toBeNull()
    expect(
      within(section).getByText(/Normal ≤ 26, Intermediate 27 - 35, Pathogenic ≥ 36/)
    ).not.toBeNull()
    expect(within(section).queryByText('Catalog note copied verbatim.')).toBeNull()
    expect(within(section).queryByText(/Matched LR reference component/)).toBeNull()
    expect(within(section).queryByText(/Catalog reference repeat unit/)).toBeNull()
    expect(within(section).queryByText(/Catalog repeat units/)).toBeNull()
    expect(within(section).queryByText(/All catalog motifs/)).toBeNull()
    expect(
      within(section).queryByText(
        /Catalog disease names and repeat-count ranges are locus reference/
      )
    ).toBeNull()
    expect(within(section).queryByText(/does not classify any LR allele/)).toBeNull()
    const diseaseTable = within(section).getByRole('region', {
      name: 'Known disease-associated TR locus disease table',
    })
    const landscape = screen.getByRole('heading', { name: 'Allelic landscape' }).closest('section')!
    expect(diseaseTable.compareDocumentPosition(shortReadLink)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(section.compareDocumentPosition(landscape)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(within(section).queryByText('Exact catalog match')).toBeNull()
    expect(within(section).queryByText('Catalog match provenance')).toBeNull()
    expect(within(section).queryByText('Short-read reference-cohort distributions')).toBeNull()
    expect(within(section).queryByText(/Green short-read repeat-count plots/)).toBeNull()
    expect(within(section).getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(within(section).getAllByRole('link')).toHaveLength(2)
    fireEvent.click(
      within(section).getByRole('button', { name: 'About known disease-associated TR locus' })
    )
    const help = screen.getByRole('dialog', {
      name: 'About known disease-associated TR locus',
    })
    expect(within(help).getByText(/exact coordinate-and-stored-motif identity/)).not.toBeNull()
    expect(within(help).getByText(/corresponding gnomAD short-read data page/)).not.toBeNull()
    expect(within(help).queryByText(/Load short-read distributions/)).toBeNull()
    expect(
      within(help).getByText(/do not classify, filter, or select any LR allele/)
    ).not.toBeNull()
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
    } as any
    renderPage({ locus })
    expect(screen.queryByRole('heading', { name: /Known disease-associated TR locus/ })).toBeNull()
    expect(
      screen.queryByRole('heading', { name: /Short-read reference-cohort distributions/ })
    ).toBeNull()
    expect(screen.queryByText(/Short-read known-locus ranges are reference context/)).toBeNull()
    expect(screen.queryByText(/Outlined component/)).toBeNull()
    expect(
      screen.queryByText('Exact short-read catalog reference match (identity only)')
    ).toBeNull()
    expect(document.querySelector('[data-exact-reference-component-match="true"]')).toBeNull()
  })

  test('filters the primary index to every same-length identity and clears back to all', () => {
    renderPage()
    const table = screen.getByRole('table', { name: 'Source ALT allele index' })
    const allAllelesHeading = screen.getByRole('heading', {
      name: '72 source ALT alleles',
    })
    expect(allAllelesHeading).not.toBeNull()
    expect(allAllelesHeading.closest('header')).toHaveStyleRule('flex-wrap', 'wrap')
    expect(table.getAttribute('aria-rowcount')).toBe('73')

    fireEvent.click(
      screen.getByRole('button', { name: /−6 bp vs REF; 134 called non-reference allele copies/ })
    )
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '2 of 72 source ALT alleles at −6 bp vs REF' })
    )
    expect(table.getAttribute('aria-rowcount')).toBe('3')
    expect(within(table).getByTitle(`${sourceVariantId}~2`)).not.toBeNull()
    expect(within(table).getByTitle(`${sourceVariantId}~3`)).not.toBeNull()
    expect(screen.getAllByRole('table', { name: 'Source ALT allele index' })).toHaveLength(1)
    expect(screen.queryByRole('table', { name: /Exact ALTs at/ })).toBeNull()

    const selectedControl = within(table).getByRole('link', {
      name: 'Details shown for Sequence 2',
    })
    const otherControl = within(table).getByRole('link', { name: 'Details for Sequence 3' })
    expect(selectedControl.getAttribute('aria-current')).toBe('page')
    expect(otherControl.getAttribute('aria-current')).toBeNull()
    expect(selectedControl.closest('[role="row"]')?.getAttribute('aria-selected')).toBeNull()
    expect(fireEvent.click(otherControl)).toBe(false)
    expect(navigation.onSelectAllele).toHaveBeenCalledWith(`${sourceVariantId}~3`)

    fireEvent.click(screen.getByRole('button', { name: 'Show all source ALT alleles' }))
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: '72 source ALT alleles' })
    )
    expect(table.getAttribute('aria-rowcount')).toBe('73')
  })

  test('highlights the exact GCA ALT at a one-component repeat-focused locus without projection', () => {
    const locus = makeSimpleLocus()
    const gcaId = 'chr3-63912684-TRV-30~15'
    const ref = 'GGCAGCAGCAGCAGCAGCAGCAGCAGCAGCA'
    const alt = 'GGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCC'
    Object.assign(locus, {
      id: '3-63912684-63912714-GCA',
      source_trid: '3-63912684-63912714-GCA',
      chrom: '3',
      motifs: ['GCA'],
      components: [{ chrom: '3', start0: 63912684, end0: 63912714, motif: 'GCA' }],
      selected_allele: {
        ...locus.selected_allele,
        variant_id: gcaId,
        source_variant_id: 'chr3-63912684-TRV-30',
        alt_index: 15,
        alt_count: 16,
        ref,
        alt,
        decomposition_status: 'UNAVAILABLE_NO_DECOMPOSITION',
        decomposition_reason: 'No admitted source decomposition is available for this exact allele',
      },
      alleles: {
        ...locus.alleles,
        nodes: locus.alleles.nodes.map((allele, index) =>
          index === 0
            ? {
                ...allele,
                variant_id: gcaId,
                source_variant_id: 'chr3-63912684-TRV-30',
                alt_index: 15,
                alt_count: 16,
                ref,
                alt,
              }
            : allele
        ),
      },
    })

    renderPage({ locus, selectedAllele: gcaId })

    const detail = screen.getByTestId('lr-tr-selected-detail')
    const exactSequence = within(detail).getByLabelText(
      'Exact copyable source sequence for Sequence 15'
    )
    expect(exactSequence.textContent).toBe(alt)
    expect(exactSequence.querySelectorAll('[data-sequence-match="motif"]').length).toBeGreaterThan(
      0
    )
    expect(
      exactSequence.querySelectorAll('[data-sequence-match="interruption-or-mismatch"]').length
    ).toBeGreaterThan(0)
    expect(within(detail).getByText(/Dark bases are interruptions or mismatches/)).not.toBeNull()
    expect(within(detail).getByText(/does not assign bases to reference components/)).not.toBeNull()
    expect(within(detail).queryByText(/Sequence analysis details/)).toBeNull()
    expect(within(detail).queryByText(/tokens/)).toBeNull()
    expect(within(detail).queryByRole('heading', { name: /Exact ALT sequence/ })).toBeNull()

    const selectedIndexRow = screen.getByTitle(gcaId)
    expect(
      within(selectedIndexRow).getByRole('img', { name: 'Sequence 15 motif structure preview' })
    ).not.toBeNull()
    expect(
      within(selectedIndexRow).queryByRole('img', { name: /neutral represented sequence/ })
    ).toBeNull()
  })

  test('links purity and keeps compound selected sequence neutral and copyable', () => {
    renderPage()
    const detail = screen.getByTestId('lr-tr-selected-detail')
    expect(detail).toBe(document.activeElement)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(within(detail).getByText(exactId)).not.toBeNull()
    expect(within(detail).getByText(/source_ap_allele/)).not.toBeNull()
    expect(
      within(detail).getByText(/shown neutrally because no admitted projection/)
    ).not.toBeNull()
    expect(
      within(detail).getByLabelText('Exact copyable source sequence for Sequence 2').textContent
    ).toContain('ACAGCAA')
    expect(within(detail).queryByLabelText('Selected ALT motif structure grid')).toBeNull()
    expect(detail.querySelector('[data-sequence-match="motif"]')).toBeNull()
    expect(within(detail).queryByText(/Sequence analysis details/)).toBeNull()
    expect(within(detail).queryByText(/tokens/)).toBeNull()
    const selectedIndexRow = screen.getByTitle(exactId)
    expect(
      within(selectedIndexRow).getByRole('img', { name: /neutral represented sequence/ })
    ).not.toBeNull()
    expect(
      screen.getByRole('group', {
        name: /source ALT alleles plotted by change from REF and source-reported motif purity/,
      })
    ).not.toBeNull()
  })

  test('uses materially different point areas for heterogeneous exact-allele AC', () => {
    renderPage()
    const lowAcPoint = screen.getByRole('button', { name: /Sequence 1.+40 called allele copies/ })
    const highAcPoint = screen.getByRole('button', { name: /Sequence 2.+120 called allele copies/ })
    const lowDiameter = Number(lowAcPoint.getAttribute('data-point-diameter'))
    const highDiameter = Number(highAcPoint.getAttribute('data-point-diameter'))

    expect(highDiameter ** 2 / lowDiameter ** 2).toBeGreaterThan(4)
    expect(purityPointDiameter(12, 12, 12)).toBe(16)
    expect(highAcPoint.getAttribute('data-selected-allele')).toBe('true')
    expect(highAcPoint).toHaveStyleRule('box-sizing', 'border-box')
    expect(
      screen.getByLabelText('Point size represents source ALT allele AC from 40 to 120')
    ).not.toBeNull()
  })

  test('distinguishes reference identity from a zero-delta exact ALT in genotype pair detail', () => {
    renderPage()
    expect(
      screen.getByText(
        (_text, element) =>
          Boolean(
            element?.textContent?.includes(
              'Reference remains distinct from a zero-change source ALT identity in either axis mode'
            )
          ),
        { selector: 'p' }
      )
    ).not.toBeNull()
    expect(screen.getAllByRole('link', { name: 'Sequence 1' }).length).toBeGreaterThan(0)
    const zeroDeltaCell = screen.getByRole('button', {
      name: /0 bp vs REF longer allele, 0 bp vs REF shorter allele: 20 people; filter the source-ALT index/,
    })
    expect(zeroDeltaCell).not.toBeNull()
    expect(zeroDeltaCell.closest('svg')?.getAttribute('role')).toBe('group')

    fireEvent.click(zeroDeltaCell)
    expect(document.activeElement).toBe(
      screen.getByRole('heading', {
        name: '1 of 72 source ALT alleles — selected genotype cell (0 bp vs REF × 0 bp vs REF)',
      })
    )
    expect(
      screen.getByRole('table', { name: 'Source ALT allele index' }).getAttribute('aria-rowcount')
    ).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Show all source ALT alleles' }))
    expect(screen.getByRole('heading', { name: '72 source ALT alleles' })).toBe(
      document.activeElement
    )
  })

  test.each([72, 497])(
    'shows all %s exact ALT sequences in the primary virtualized browser',
    (count) => {
      renderPage({ locus: makeLocus(count), selectedAllele: undefined })
      const heading = screen.getByRole('heading', { name: `${count} source ALT alleles` })
      const section = heading.closest('section')
      expect(section).not.toBeNull()
      expect(heading.closest('details')).toBeNull()
      const virtualIndex = within(section as HTMLElement).getByTestId('virtual-exact-index')
      expect(virtualIndex.getAttribute('data-item-count')).toBe(String(count))
      expect(virtualIndex.getAttribute('data-height')).toBe('312')
      expect(virtualIndex.classList.contains('lr-tr-exact-index-scroll')).toBe(true)
      const finalRow = screen.getByTitle(`${sourceVariantId}~${count}`)
      expect(finalRow.getAttribute('aria-rowindex')).toBe(String(count + 1))
      expect(
        within(finalRow).getByText(new RegExp(`Source ALT ${count} of ${count}`))
      ).not.toBeNull()
      expect(
        within(finalRow).getByRole('link', { name: `Details for Sequence ${count}` })
      ).not.toBeNull()
      expect(
        within(finalRow).getByRole('img', {
          name: `Sequence ${count} neutral represented sequence; no component projection is admitted`,
        })
      ).not.toBeNull()
      expect(finalRow.getAttribute('aria-label')).toMatch(
        new RegExp(
          `Sequence ${count}; ${sourceVariantId}~${count}; length .+; purity .+; AC .+; AF .+`
        )
      )
      expect(
        screen.getByRole('table', { name: 'Source ALT allele index' }).getAttribute('aria-rowcount')
      ).toBe(String(count + 1))
    }
  )

  test('shows the complete allele identity and formats AC as an integer count', () => {
    const locus = makeLocus()
    locus.alleles.nodes[0].freq.all.ac = 20.00342
    renderPage({ locus, selectedAllele: undefined })
    const row = screen.getByTitle(`${sourceVariantId}~1`)
    expect(within(row).getByText(/Source ALT 1 of 72/)).not.toBeNull()
    expect(within(row).getByText('20')).not.toBeNull()
    expect(within(row).queryByText('20.00342')).toBeNull()

    const table = screen.getByRole('table', { name: 'Source ALT allele index' })
    const acSort = within(table).getByRole('button', { name: 'AC' })
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
        /Exact ALT details unavailable: the selected allele sequence is too large to display safely/
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

    expect(screen.getByRole('heading', { name: `Sequence 2 · Details shown` })).not.toBeNull()
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

  test('keeps compound source provenance compact and accessible', () => {
    renderPage()
    const provenance = screen
      .getByText('All ordered source components and provenance — 6 ordered components')
      .closest('details')
    expect(provenance).not.toBeNull()
    expect(provenance?.hasAttribute('open')).toBe(false)
    expect(
      within(provenance as HTMLElement).getByText('run-hgsvc', { selector: 'code' })
    ).not.toBeNull()
    expect(
      within(provenance as HTMLElement).getByText('catalog-test-digest', { selector: 'code' })
    ).not.toBeNull()
    expect(
      within(provenance as HTMLElement).getByText(
        'Exact short-read catalog main region and stored motif; no override registry used'
      )
    ).not.toBeNull()
    expect(within(provenance as HTMLElement).queryByText(/registry digest/i)).toBeNull()
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
        /Genotype length distribution is unavailable: the source does not include the required metadata/
      )
    ).not.toBeNull()
  })

  test('container makes retained data inert during exact-ALT revalidation', () => {
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
    const revalidationStatus = screen
      .getAllByRole('status')
      .find((element) =>
        /retain their loaded cohort and allele identity/i.test(element.textContent || '')
      )!
    expect(revalidationStatus).toBeDefined()
    expect(screen.getByRole('heading', { name: `Sequence 2 · Details shown` })).not.toBeNull()
    expect(screen.getByRole('heading', { name: '72 source ALT alleles' })).not.toBeNull()
    const retainedFrame = revalidationStatus.nextElementSibling as HTMLElement
    expect(retainedFrame.hasAttribute('inert')).toBe(true)
    expect(retainedFrame.getAttribute('aria-busy')).toBe('true')
    expect(
      within(retainedFrame).queryByRole('heading', {
        name: `Sequence 3 · Details shown`,
      })
    ).toBeNull()
    ;(global as any).__TR_QUERY_STATE__ = {
      data: { long_read_tandem_repeat_locus: freshLocus },
      requestVariables: { allele: nextAlleleId },
      stale: false,
    }
    rendered.rerender(React.cloneElement(page))

    expect(screen.getByRole('heading', { name: `Sequence 1 · Details shown` })).not.toBeNull()
    expect(screen.getByTestId('lr-tr-selected-detail')).not.toBe(document.activeElement)
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  test('container does not relabel retained HGSVC data as the requested AoU cohort', () => {
    const staleLocus = makeLocus()
    const history = createMemoryHistory({
      initialEntries: [`/tandem-repeat/${staleLocus.id}?dataset=gnomad_r4_lr&lr_cohort=aou`],
    })
    ;(global as any).__TR_QUERY_STATE__ = {
      data: { long_read_tandem_repeat_locus: staleLocus },
      requestVariables: { lrCohort: 'hgsvc_hprc', allele: null },
      stale: true,
    }
    render(
      <Router history={history}>
        <ThemeProvider
          theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
        >
          <LongReadTandemRepeatPageContainer
            datasetId="gnomad_r4_lr"
            locusId={staleLocus.id}
            lrCohort="aou"
          />
        </ThemeProvider>
      </Router>
    )

    const status = screen
      .getAllByRole('status')
      .find((element) =>
        /retain their loaded cohort and allele identity/i.test(element.textContent || '')
      )!
    expect(status).toBeDefined()
    const retainedFrame = status.nextElementSibling as HTMLElement
    expect(retainedFrame.hasAttribute('inert')).toBe(true)
    expect(
      (within(retainedFrame).getByLabelText('Long-read cohort') as HTMLSelectElement).value
    ).toBe('hgsvc_hprc')
    expect(screen.getByRole('heading', { name: 'HTT CAG tandem repeat' })).not.toBeNull()
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
      within(screen.getByRole('table', { name: 'Source ALT allele index' })).getByRole('link', {
        name: 'Details for Sequence 2',
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
    expect(longReadTandemRepeatLocusQuery).toContain('accepted_task_attempt_digest')
    expect(longReadTandemRepeatLocusQuery).toContain('presentation {')
    expect(longReadTandemRepeatLocusQuery).toContain('bounds {')
    expect(longReadTandemRepeatLocusQuery).toContain('component_summary {')
    expect(longReadTandemRepeatLocusQuery).toContain('sequence_cardinality {')
    expect(longReadTandemRepeatLocusQuery).toContain('represented_length {')
    expect(longReadTandemRepeatLocusQuery).toContain('filter_contract {')
    expect(longReadTandemRepeatLocusQuery).toContain('represented_allele_length_min')
    expect(longReadTandemRepeatLocusQuery).toContain('whole_record_genotype_landscape')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele_unavailable_reason')
    expect(longReadTandemRepeatLocusQuery).toContain('selected_allele {')
    expect(longReadTandemRepeatLocusQuery).toContain('ref alt length')
    expect(longReadTandemRepeatLocusQuery).toContain('source_records {')
    expect(longReadTandemRepeatLocusQuery).toContain('repeat_count_plots')
    expect(longReadTandemRepeatLocusQuery).toContain('interaction { interaction_status reason }')
    expect(longReadTandemRepeatLocusQuery).toContain('primary_repeat {')
    expect(longReadTandemRepeatLocusQuery).toContain('catalog_id catalog_digest registry_digest')
    expect(longReadTandemRepeatLocusQuery).toContain('short_read_context {')
    expect(longReadTandemRepeatLocusQuery).toContain('exact_reference_component_outline_authorized')
    expect(longReadTandemRepeatLocusQuery).not.toContain('repeat_units {')
    expect(longReadTandemRepeatLocusQuery).not.toContain(
      'matched_reference_repeat_unit_classifications'
    )
    expect(longReadTandemRepeatLocusQuery).not.toContain('pathogenic_component_highlight')
    expect(longReadTandemRepeatLocusQuery).toContain('associated_diseases {')
    expect(longReadTandemRepeatLocusQuery).not.toContain('short_read_matches')
    expect(longReadTandemRepeatLocusQuery).not.toContain('$after')
  })
})
