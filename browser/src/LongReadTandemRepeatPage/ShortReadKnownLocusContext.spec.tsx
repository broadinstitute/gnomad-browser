import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

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
  ExternalLink: ({ children, href }: any) => <a href={href}>{children}</a>,
}))

const exactContext: LongReadTrShortReadContext = {
  status: 'EXACT_UNIQUE',
  reason_code: null,
  catalog_dataset: 'gnomad_r4',
  catalog_source: 'known-str-catalog',
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
    repeat_units: [
      { repeat_unit: 'CAG', classification: 'pathogenic' },
      { repeat_unit: 'CAA', classification: 'reference' },
      { repeat_unit: 'A', classification: 'reference' },
    ],
  },
  matched_component_index: 0,
  matched_component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  matched_reference_region_index: 0,
  exact_reference_component_outline_authorized: true,
  matched_reference_repeat_unit_classifications: ['pathogenic'],
  lr_database: 'gnomad_lr_y1_full_genome',
  lr_release: 'y1',
  lr_run_id: 'run-hgsvc',
  lr_cohort: 'hgsvc_hprc',
}

describe('ShortReadKnownLocusContext', () => {
  test('renders copied catalog context and the mandatory non-classification disclaimer', () => {
    render(<ShortReadKnownLocusContext context={exactContext} />)

    const panel = screen
      .getByRole('heading', { name: /Short-read known-locus context/ })
      .closest('section') as HTMLElement
    expect(within(panel).getByText('Exact reference-component match')).not.toBeNull()
    expect(within(panel).getByText(/Component 1: chr4:3,074,877–3,074,933/)).not.toBeNull()
    expect(
      within(panel).getByText(
        (_text, element) => element?.tagName === 'DD' && element.textContent === 'CAG — pathogenic'
      )
    ).not.toBeNull()
    expect(within(panel).getByText('Huntington disease (HD)')).not.toBeNull()
    expect(within(panel).getByText('Source note.')).not.toBeNull()
    const primaryMotifs = within(panel).getByRole('table', {
      name: 'Primary short-read catalog repeat units',
    })
    expect(within(primaryMotifs).getByText('Matched catalog reference repeat unit')).not.toBeNull()
    expect(within(primaryMotifs).getByText('Other catalog motif')).not.toBeNull()
    expect(within(primaryMotifs).queryByText('A')).toBeNull()
    fireEvent.click(within(panel).getByText('All catalog motifs (3)'))
    expect(
      within(within(panel).getByRole('table', { name: 'All short-read catalog motifs' })).getByText(
        'A'
      )
    ).not.toBeNull()
    expect(within(panel).getByText(/Short-read reference context only/)).not.toBeNull()
    expect(within(panel).getByText(/do not classify any.*LR allele/i)).not.toBeNull()
    expect(
      within(panel)
        .getByRole('link', { name: /HTT.*short-read details/ })
        .getAttribute('href')
    ).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')
  })

  test.each([
    'NONE',
    'MULTIPLE',
    'AMBIGUOUS_CATALOG',
    'AMBIGUOUS_COMPONENT',
    'CATALOG_UNAVAILABLE',
    'UNAVAILABLE',
  ])('renders no panel for %s', (status) => {
    const { container } = render(
      <ShortReadKnownLocusContext
        context={{ ...exactContext, status: status as LongReadTrShortReadContext['status'] }}
      />
    )
    expect(container.childElementCount).toBe(0)
  })
})
