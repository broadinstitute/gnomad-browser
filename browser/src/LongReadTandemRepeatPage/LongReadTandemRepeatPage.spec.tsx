import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'

import LongReadTandemRepeatPage, {
  referenceCopySummary,
  referenceRepeatCount,
} from './LongReadTandemRepeatPage'

jest.mock('../Link', () => ({ children, to, ...props }: any) => (
  <a href={to} {...props}>
    {children}
  </a>
))
jest.mock('../LongReadVariantPage/LongReadSTRDistributionSections', () => ({
  LongReadAlleleSizeDistributionSection: ({ heading, calledCountDistributions }: any) => (
    <div>
      <h2>{heading}</h2>
      <p>
        {calledCountDistributions.alleleSizeDistribution
          .flatMap((cohort: any) => cohort.distribution)
          .reduce((sum: number, bin: any) => sum + bin.frequency, 0)}{' '}
        called alleles
      </p>
    </div>
  ),
  LongReadGenotypeDistributionSection: ({ heading, calledCountDistributions }: any) => (
    <div>
      <h2>{heading}</h2>
      <p>
        {calledCountDistributions.genotypeDistribution
          .flatMap((cohort: any) => cohort.distribution)
          .reduce((sum: number, bin: any) => sum + bin.frequency, 0)}{' '}
        complete two-allele genotypes
      </p>
    </div>
  ),
}))

jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
  Modal: ({ children, title }: any) => (
    <div role="dialog" aria-label={title}>
      {children}
    </div>
  ),
}))

const sourceVariantId = 'chr4-39348424-TRV-55'
const exactAllele = `${sourceVariantId}~7`
const locus = {
  id: '4-39348424-39348479-AAAAG',
  source_trid: '4-39348424-39348479-AAAAG',
  chrom: '4',
  motifs: ['AAAAG'],
  structure: '(AAAAG)n',
  lr_cohort: 'hgsvc_hprc' as const,
  source_release: 'y1',
  source_run_id: 'run-hgsvc',
  total_alleles: 200,
  unique_carrier_count: 492,
  selected_allele_valid: true,
  components: [{ chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' }],
  source_records: [
    {
      record_index: 1,
      source_variant_id: sourceVariantId,
      alt_count: 200,
      ref: 'CAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAGAAAAG',
      non_reference_ac: 500,
      an: 582,
      non_reference_af: 0.86,
      source: 'TRGT',
      region: null,
    },
  ],
  repeat_count_plots: {
    status: 'AVAILABLE_EXACT' as const,
    reason_code: null,
    identity: {
      ancillary_run_id: 'str-run-hgsvc',
      primary_database: 'primary-db',
      primary_run_id: 'run-hgsvc',
      primary_task_id: 'task-1',
      primary_attempt_id: 'attempt-1',
      source_variant_id: sourceVariantId,
      component: { chrom: '4', start0: 39348424, end0: 39348479, motif: 'AAAAG' },
    },
    unit: 'MOTIF_REPEAT_COUNT',
    repeat_unit: 'AAAAG',
    overall: {
      called_alleles: 582,
      called_diploid_genotypes: 291,
      no_call_rate: null,
      no_call_rate_status: 'UNAVAILABLE_NOT_IN_ADMITTED_HISTOGRAM_CONTRACT',
    },
    allele_size_distribution: [
      {
        ancestry_group: 'afr' as const,
        sex: 'XX' as const,
        repunit: 'AAAAG',
        distribution: [{ repunit_count: 10, frequency: 582, colorByValue: null }],
      },
    ],
    genotype_distribution: [
      {
        ancestry_group: 'afr',
        sex: 'XX' as const,
        short_allele_repunit: 'AAAAG',
        long_allele_repunit: 'AAAAG',
        distribution: [
          {
            short_allele_repunit_count: 10,
            long_allele_repunit_count: 10,
            frequency: 291,
          },
        ],
      },
    ],
    max_repunits: 168,
  },
  short_read_matches: [],
  alleles: {
    nodes: [
      {
        variant_id: exactAllele,
        source_variant_id: sourceVariantId,
        alt_index: 7,
        alt_count: 200,
        ref: 'AAAAAG',
        alt: 'AAAAAGAAAAAGAAAAAGAAAAAGAAAAAGAAAAAG',
        length: -5,
        repeat_count: 10,
        repeat_count_source: 'source_mc_allele',
        motif_purity: 1,
        freq: {
          all: { id: 'all', ac: 135, an: 582, af: 0.231959 },
          populations: [{ id: 'afr', ac: 20, an: 100, af: 0.2 }],
        },
      },
    ],
    page_info: { has_next_page: true, end_cursor: 'cursor' },
  },
}

const renderPage = (selectedAllele = exactAllele) =>
  render(
    <ThemeProvider
      theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
    >
      <LongReadTandemRepeatPage
        datasetId="gnomad_r4_lr"
        locus={locus}
        selectedAllele={selectedAllele}
        onCohortChange={jest.fn()}
        onNextPage={jest.fn()}
      />
    </ThemeProvider>
  )

describe('canonical long-read tandem-repeat locus page', () => {
  test('uses explicit coordinate conversion for display and UCSC', () => {
    renderPage()
    expect(screen.getAllByText(/39,348,425/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'UCSC' }).getAttribute('href')).toContain(
      'chr4%3A39348425-39348479'
    )
  })

  test('renders a selected exact allele as one fixed row with old URL compatibility', () => {
    const { container } = renderPage()
    const rows = container.querySelectorAll('[data-testid="lr-tr-allele-table"] tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('Reference')
    expect(rows[1].getAttribute('aria-selected')).toBe('true')
    expect(getComputedStyle(rows[1].querySelector('td')!).whiteSpace).toBe('nowrap')
    expect(screen.getByRole('link', { name: 'Open exact' }).getAttribute('href')).toBe(
      `/variant/${exactAllele}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
  })

  test('makes exact called-count plots primary above provenance and supporting alleles', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Allele repeat-count distribution' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Diploid genotype distribution' })).not.toBeNull()
    expect(screen.getByText('582 called alleles')).not.toBeNull()
    expect(screen.getByText('291 complete two-allele genotypes')).not.toBeNull()

    const plotHeading = screen.getByRole('heading', { name: 'Allele repeat-count distribution' })
    const alleleHeading = screen.getByRole('heading', { name: 'Observed alleles' })
    expect(plotHeading.compareDocumentPosition(alleleHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  test('explains reference copies, alternate copies, and carrier semantics', () => {
    const tLocus = {
      ...locus,
      id: '1-143278475-143278486-T',
      source_trid: '1-143278475-143278486-T',
      chrom: '1',
      motifs: ['T'],
      total_alleles: 3,
      unique_carrier_count: 183,
      components: [{ chrom: '1', start0: 143278475, end0: 143278486, motif: 'T' }],
      source_records: [
        {
          ...locus.source_records[0],
          alt_count: 3,
          ref: 'ATTTTTTTTTTT',
          non_reference_ac: 215,
          an: 584,
          non_reference_af: 215 / 584,
        },
      ],
      repeat_count_plots: {
        ...locus.repeat_count_plots,
        repeat_unit: 'T',
        overall: {
          ...locus.repeat_count_plots.overall,
          called_alleles: 584,
          called_diploid_genotypes: 292,
        },
      },
    }
    render(
      <ThemeProvider
        theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
      >
        <LongReadTandemRepeatPage
          datasetId="gnomad_r4_lr"
          locus={tLocus}
          onCohortChange={jest.fn()}
          onNextPage={jest.fn()}
        />
      </ThemeProvider>
    )

    expect(screen.getByText(/11 T repeats/)).not.toBeNull()
    expect(screen.getByText(/584 called chromosome copies/)).not.toBeNull()
    expect(screen.getByText(/292 individuals with complete diploid genotypes/)).not.toBeNull()
    expect(screen.getByText(/369 reference and 215 non-reference copies/)).not.toBeNull()
    expect(screen.getByText(/3 observed non-reference allele types/)).not.toBeNull()
    expect(screen.getByText(/183 unique carriers/)).not.toBeNull()
    expect(screen.getByText(/Carrier count is a count of people/)).not.toBeNull()
    const referenceCells = screen.getByTestId('lr-tr-reference-row').children
    expect(referenceCells[0].textContent).toContain('Reference')
    expect(referenceCells[1].textContent).toBe('11')
    expect(referenceCells[4].textContent).toBe('369')
    expect(referenceCells[5].textContent).toBe('584')
    expect(screen.getByText('all called chromosome copies')).not.toBeNull()
  })

  test('uses unavailable instead of combining mismatched or multiple source records', () => {
    expect(referenceRepeatCount({ components: locus.components })).toBe(11)
    expect(referenceRepeatCount({ components: [...locus.components, ...locus.components] })).toBe(
      null
    )
    expect(
      referenceCopySummary({
        source_records: [...locus.source_records, { ...locus.source_records[0], record_index: 2 }],
        repeat_count_plots: locus.repeat_count_plots,
      })
    ).toBeNull()
    expect(
      referenceCopySummary({
        source_records: locus.source_records,
        repeat_count_plots: {
          ...locus.repeat_count_plots,
          overall: { ...locus.repeat_count_plots.overall, called_alleles: 999 },
        },
      })
    ).toBeNull()
  })

  test('demotes raw identities and explains source sequence anchors', () => {
    renderPage()
    const technicalSummary = screen.getByText('Technical details and provenance')
    expect(technicalSummary.closest('details')?.hasAttribute('open')).toBe(false)
    expect(screen.getByText('primary-db').closest('details')).toBe(
      technicalSummary.closest('details')
    )
    expect(screen.getByText(/shared anchor base required by variant notation/)).not.toBeNull()
  })

  test('renders the verified All of Us called denominators independently', () => {
    const aou = {
      ...locus,
      lr_cohort: 'aou' as const,
      source_run_id: 'run-aou',
      source_records: [{ ...locus.source_records[0], an: 2046, non_reference_ac: 1500 }],
      repeat_count_plots: {
        ...locus.repeat_count_plots,
        identity: {
          ...locus.repeat_count_plots.identity,
          ancillary_run_id: 'str-run-aou',
          primary_run_id: 'run-aou',
        },
        overall: {
          ...locus.repeat_count_plots.overall,
          called_alleles: 2046,
          called_diploid_genotypes: 1023,
        },
        allele_size_distribution: [
          {
            ancestry_group: 'afr' as const,
            sex: 'XX' as const,
            repunit: 'AAAAG',
            distribution: [{ repunit_count: 10, frequency: 2046, colorByValue: null }],
          },
        ],
        genotype_distribution: [
          {
            ancestry_group: 'afr',
            sex: 'XX' as const,
            short_allele_repunit: 'AAAAG',
            long_allele_repunit: 'AAAAG',
            distribution: [
              {
                short_allele_repunit_count: 10,
                long_allele_repunit_count: 10,
                frequency: 1023,
              },
            ],
          },
        ],
      },
    }
    render(
      <ThemeProvider
        theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
      >
        <LongReadTandemRepeatPage
          datasetId="gnomad_r4_lr"
          locus={aou}
          onCohortChange={jest.fn()}
          onNextPage={jest.fn()}
        />
      </ThemeProvider>
    )
    expect(screen.getByText('2046 called alleles')).not.toBeNull()
    expect(screen.getByText('1023 complete two-allele genotypes')).not.toBeNull()
  })

  test('fails compound loci closed instead of presenting component plots', () => {
    const compound = {
      ...locus,
      id: '1-121606499-121606508-AG+1-121606517-121606536-A',
      components: [
        { chrom: '1', start0: 121606499, end0: 121606508, motif: 'AG' },
        { chrom: '1', start0: 121606517, end0: 121606536, motif: 'A' },
      ],
      repeat_count_plots: {
        ...locus.repeat_count_plots,
        status: 'UNAVAILABLE_COMPOUND_LOCUS' as const,
        identity: null,
        allele_size_distribution: [],
        genotype_distribution: [],
        max_repunits: null,
      },
    }
    render(
      <ThemeProvider
        theme={{ colors: { border: '#ddd', highlightedBackground: '#ffc', link: '#06c' } }}
      >
        <LongReadTandemRepeatPage
          datasetId="gnomad_r4_lr"
          locus={compound}
          onCohortChange={jest.fn()}
          onNextPage={jest.fn()}
        />
      </ThemeProvider>
    )
    expect(
      screen.getByText(/multiple repeat components and no admitted single whole-locus/)
    ).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Allele repeat-count distribution' })).toBeNull()
  })

  test('opens sequence detail in a modal, never a child table row', () => {
    const { container } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Details for ALT 7' }))
    expect(screen.getByRole('dialog', { name: 'ALT 7 details' })).not.toBeNull()
    expect(container.querySelectorAll('[data-testid="lr-tr-allele-table"] tbody tr')).toHaveLength(
      2
    )
    expect(screen.getByText(/not a clinical classification/)).not.toBeNull()
  })
})
