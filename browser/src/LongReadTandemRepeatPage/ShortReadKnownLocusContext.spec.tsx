import React from 'react'
import { render, screen, within } from '@testing-library/react'

import ShortReadKnownLocusContext from './ShortReadKnownLocusContext'
import { LongReadTrShortReadContext } from './types'

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
jest.mock('../Haplotypes/HelpButton', () => ({ title }: any) => (
  <button type="button">{title}</button>
))
jest.mock('@gnomad/ui', () => ({
  BaseTable: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  ExternalLink: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

const exactContext: LongReadTrShortReadContext = {
  status: 'EXACT_UNIQUE',
  reason_code: null,
  catalog_dataset: 'gnomad_r4',
  catalog_source: 'Frozen gnomAD short-read tandem-repeat catalog snapshot',
  catalog_digest: 'catalog-digest',
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
        notes: 'Source note.',
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
    reference_regions: [{ reference_genome: 'GRCh38', chrom: '4', start: 3074876, stop: 3074933 }],
    reference_repeat_unit: 'CAG',
  },
  matched_component_index: 0,
  matched_component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  matched_reference_region_index: 0,
  exact_reference_component_outline_authorized: true,
  lr_database: 'gnomad_lr_y1_full_genome',
  lr_release: 'y1',
  lr_run_id: 'run-hgsvc',
  lr_cohort: 'hgsvc_hprc',
}

const renderContext = (context: LongReadTrShortReadContext | null = exactContext) =>
  render(
    <ShortReadKnownLocusContext
      locusId="4-3074876-3074933-CAG"
      lrCohort="hgsvc_hprc"
      context={context}
    />
  )

describe('ShortReadKnownLocusContext', () => {
  test('renders an unboxed assay-neutral disease section with only the retained catalog fields', () => {
    renderContext()

    const section = screen
      .getByRole('heading', { name: /Known disease-associated TR locus/ })
      .closest('section') as HTMLElement
    expect(within(section).getByText('Exact catalog match')).not.toBeNull()

    expect(
      within(section)
        .getByRole('link', { name: 'HTT — view known disease-associated TR locus' })
        .getAttribute('href')
    ).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')

    const tableScroller = within(section).getByRole('region', {
      name: 'Known disease-associated TR locus disease table',
    })
    expect(tableScroller.getAttribute('tabindex')).toBe('0')
    const table = within(tableScroller).getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Disease' })).not.toBeNull()
    expect(within(table).getByRole('columnheader', { name: 'OMIM' })).not.toBeNull()
    expect(within(table).getByRole('columnheader', { name: 'Inheritance' })).not.toBeNull()
    expect(
      within(table).getByRole('columnheader', { name: 'Catalog repeat-count ranges' })
    ).not.toBeNull()
    expect(within(table).getByRole('rowheader', { name: 'Huntington disease' })).not.toBeNull()
    expect(within(table).getByRole('link', { name: '143100' }).getAttribute('href')).toBe(
      'https://omim.org/entry/143100'
    )
    expect(within(table).getByText('Autosomal dominant')).not.toBeNull()
    expect(
      within(table).getByText('Normal ≤ 26, Intermediate 27 - 35, Pathogenic ≥ 36')
    ).not.toBeNull()

    expect(within(section).queryByText('Source note.')).toBeNull()
    expect(within(section).queryByText(/Matched LR reference component/)).toBeNull()
    expect(within(section).queryByText(/Catalog reference repeat unit/)).toBeNull()
    expect(within(section).queryByText(/Catalog repeat units/)).toBeNull()
    expect(within(section).queryByText(/All catalog motifs/)).toBeNull()
    expect(within(section).queryByText(/Known STR locus/)).toBeNull()
    expect(within(section).queryByText(/short-read details/)).toBeNull()
    expect(
      within(section).getByText(/Catalog disease names and repeat-count ranges are locus reference/)
    ).not.toBeNull()
    expect(within(section).getByText(/does not classify any LR allele/)).not.toBeNull()

    expect(within(section).getByText('Catalog match provenance')).not.toBeNull()
    expect(within(section).getByText(exactContext.catalog_source)).not.toBeNull()
    expect(within(section).getByText('catalog-digest')).not.toBeNull()
    expect(within(section).getByText('run-hgsvc')).not.toBeNull()
    expect(within(section).getByText('hgsvc_hprc')).not.toBeNull()
    expect(
      within(section).getByRole('heading', {
        level: 3,
        name: 'Short-read reference-cohort distributions',
      })
    ).not.toBeNull()
  })

  test('keeps multiple catalog diseases as separate rows without notes', () => {
    const secondDisease = {
      ...exactContext.catalog_record!.associated_diseases[0],
      name: 'Second disease',
      symbol: 'SECOND',
      omim_id: '654321',
      repeat_size_classifications: [{ classification: 'Pathogenic', min: 80, max: null }],
      notes: 'Second source note.',
    }
    renderContext({
      ...exactContext,
      catalog_record: {
        ...exactContext.catalog_record!,
        id: 'COMP',
        gene: { ensembl_id: 'ENSG-COMP', symbol: 'COMP', region: 'intronic' },
        associated_diseases: [exactContext.catalog_record!.associated_diseases[0], secondDisease],
      },
    })

    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('rowheader', { name: 'Huntington disease' })).not.toBeNull()
    expect(within(table).getByRole('rowheader', { name: 'Second disease' })).not.toBeNull()
    expect(within(table).getByText('Pathogenic ≥ 80')).not.toBeNull()
    expect(screen.queryByText(/source note/i)).toBeNull()
  })

  test.each([
    ['missing catalog record', { catalog_record: null }],
    ['missing matched component', { matched_component: null }],
    ['missing matched index', { matched_component_index: null }],
    ['missing reference-region index', { matched_reference_region_index: null }],
    ['wrong cohort binding', { lr_cohort: 'aou' }],
    ['missing catalog digest', { catalog_digest: '' }],
    ['missing LR run', { lr_run_id: null }],
  ])('renders no disease section for incomplete exact context: %s', (_name, patch) => {
    const { container } = renderContext({ ...exactContext, ...patch } as LongReadTrShortReadContext)
    expect(container.childElementCount).toBe(0)
  })

  test.each([
    'NONE',
    'MULTIPLE',
    'AMBIGUOUS_CATALOG',
    'AMBIGUOUS_COMPONENT',
    'CATALOG_UNAVAILABLE',
    'UNAVAILABLE',
  ])('renders no disease section for %s', (status) => {
    const { container } = renderContext({
      ...exactContext,
      status: status as LongReadTrShortReadContext['status'],
    })
    expect(container.childElementCount).toBe(0)
  })
})
