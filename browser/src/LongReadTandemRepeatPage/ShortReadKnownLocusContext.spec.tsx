import React from 'react'
import { render, screen } from '@testing-library/react'

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
    ],
  },
  matched_component_index: 0,
  matched_component: { chrom: '4', start0: 3074876, end0: 3074933, motif: 'CAG' },
  matched_reference_region_index: 0,
  pathogenic_component_highlight: true,
  lr_database: 'gnomad_lr_y1_full_genome',
  lr_release: 'y1',
  lr_run_id: 'run-hgsvc',
  lr_cohort: 'hgsvc_hprc',
}

describe('ShortReadKnownLocusContext', () => {
  test('renders only the fixed short-read details link for an exact match', () => {
    const { container } = render(<ShortReadKnownLocusContext context={exactContext} />)

    const link = screen.getByRole('link', { name: 'HTT (HTT) short-read details' })
    expect(link.getAttribute('href')).toBe('/short-tandem-repeat/HTT?dataset=gnomad_r4')
    expect(link.getAttribute('title')).toMatch(/Exact reference-component match/)
    expect(link.getAttribute('title')).toMatch(/not applied to long-read alleles/)
    expect(container.textContent).toBe('HTT (HTT) short-read details')
    expect(screen.queryByText('Huntington disease (HD)')).toBeNull()
    expect(screen.queryByText(/Component 1:/)).toBeNull()
  })

  test.each([
    'NONE',
    'MULTIPLE',
    'AMBIGUOUS_CATALOG',
    'AMBIGUOUS_COMPONENT',
    'CATALOG_UNAVAILABLE',
    'UNAVAILABLE',
  ])('renders no link for %s', (status) => {
    const { container } = render(
      <ShortReadKnownLocusContext
        context={{ ...exactContext, status: status as LongReadTrShortReadContext['status'] }}
      />
    )
    expect(container.childElementCount).toBe(0)
  })
})
