import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { LongReadTandemRepeatReferencePage, query } from './LongReadTandemRepeatReferencePage'
import { LongReadTrReferenceRow } from './types'

const result = (status: any, canonicalIds?: string[], reason_code?: string) => ({
  status,
  candidates: (canonicalIds || []).map((canonical_id) => ({ canonical_id })),
  reason_code,
})

const exactAtxn1 = '6-16327633-16327723-TGC'
const compoundHtt =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'

const row = (
  id: string,
  chrom: string,
  start: number,
  stop: number,
  motif: string,
  hgsvc_hprc: LongReadTrReferenceRow['hgsvc_hprc'],
  aou: LongReadTrReferenceRow['aou'],
  diseases: LongReadTrReferenceRow['short_record']['associated_diseases'] = []
): LongReadTrReferenceRow => ({
  short_record: {
    id,
    gene: { symbol: id },
    main_reference_region: { reference_genome: 'GRCh38', chrom, start, stop },
    reference_repeat_unit: motif,
    associated_diseases: diseases,
  },
  hgsvc_hprc,
  aou,
})

const rows: LongReadTrReferenceRow[] = [
  row(
    'ATXN1',
    '6',
    16327633,
    16327723,
    'TGC',
    result('EXACT_UNIQUE', [exactAtxn1]),
    result('EXACT_UNIQUE', [exactAtxn1]),
    [{ name: 'Spinocerebellar ataxia 1', symbol: 'SCA1', omim_id: '164400' }]
  ),
  row(
    'HTT',
    '4',
    3074876,
    3074933,
    'CAG',
    result('EXACT_UNIQUE', [compoundHtt]),
    result('EXACT_UNIQUE', [compoundHtt]),
    [{ name: 'Huntington disease', symbol: 'HD', omim_id: '143100' }]
  ),
  row(
    'FMR1',
    'X',
    147911990,
    147912053,
    'CGG',
    result('NONE', [], 'NO_EXACT_COMPONENT'),
    result('NONE', [], 'OVERLAP_ONLY'),
    [{ name: 'Fragile X syndrome', symbol: 'FXS', omim_id: '300624' }]
  ),
  row(
    'MULTI',
    '1',
    99,
    120,
    'AAA',
    result('MULTIPLE', ['1-99-120-AAA', '1-90-130-A+1-99-120-AAA'], 'MULTIPLE_CONTAINING_LR_LOCI'),
    result('AMBIGUOUS_COMPONENT', [], 'SHORT_RECORD_MATCHES_MULTIPLE_COMPONENTS')
  ),
  row(
    'OFFLINE',
    '2',
    299,
    320,
    'TTT',
    result('UNAVAILABLE', [], 'STALE_SOURCE'),
    result('AMBIGUOUS_CATALOG', [], 'DUPLICATE_CATALOG_EXACT_KEY')
  ),
]

const renderPage = (pageRows = rows) =>
  render(
    <MemoryRouter>
      <LongReadTandemRepeatReferencePage rows={pageRows} />
    </MemoryRouter>
  )

describe('LongReadTandemRepeatReferencePage', () => {
  test('uses one bounded reference query and refuses silent server truncation', () => {
    expect(query.match(/long_read_tandem_repeat_reference/g)).toHaveLength(1)
    expect(query).toContain('first: 100')
    expect(query).toContain('page_info { has_next_page }')
  })

  test('renders fixed short links, complete canonical LR links, coordinates, and all statuses', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Short-read STR ↔ long-read locus reference' })
    ).not.toBeNull()
    expect(screen.getByText(/do not classify long-read alleles/)).not.toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/^5 matching loci/)

    const atxn1 = within(screen.getByRole('row', { name: /ATXN1/ }))
    expect(atxn1.getByRole('link', { name: 'ATXN1' }).getAttribute('href')).toBe(
      '/short-tandem-repeat/ATXN1?dataset=gnomad_r4'
    )
    expect(atxn1.getByText('chr6:16,327,634–16,327,723')).not.toBeNull()
    const atxn1LocusLink = atxn1.getByRole('link', {
      name: `Open HGSVC/HPRC LR locus: ${exactAtxn1}`,
    })
    expect(atxn1LocusLink.textContent).toBe('Open LR locus')
    expect(atxn1LocusLink.getAttribute('title')).toBe(exactAtxn1)
    expect(atxn1LocusLink.getAttribute('href')).toBe(
      `/tandem-repeat/${exactAtxn1}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(atxn1.getAllByText('chr6:16,327,633–16,327,723 · TGC')).toHaveLength(2)
    expect(atxn1.getByText('(6, 16327633, 16327723, TGC)')).not.toBeNull()

    const httRow = within(screen.getByRole('row', { name: /HTT/ }))
    const httLinks = httRow.getAllByRole('link', { name: /Open .* LR locus:/ })
    expect(httLinks).toHaveLength(2)
    expect(httLinks[1].getAttribute('href')).toContain(`dataset=gnomad_r4_lr&lr_cohort=aou`)
    expect(httRow.getAllByText('6-component locus')).toHaveLength(2)

    expect(screen.getAllByText('No exact match')).toHaveLength(2)
    expect(screen.getByText('2 possible loci')).not.toBeNull()
    expect(screen.getByText('Unavailable')).not.toBeNull()
    expect(screen.getAllByText('Ambiguous')).toHaveLength(2)
    expect(
      screen.getByTestId('long-read-tr-reference-table-scroller').getAttribute('tabindex')
    ).toBe('0')
  })

  test('translates diagnostics while retaining machine codes in secondary details', () => {
    renderPage([
      row(
        'DIAGNOSTIC1',
        '3',
        100,
        120,
        'CAG',
        result('NONE', [], 'NO_EXACT_COMPONENT'),
        result('NONE', [], 'OVERLAP_ONLY')
      ),
      row(
        'DIAGNOSTIC2',
        '4',
        200,
        220,
        'GAA',
        result('NONE', [], 'REGION_EQUAL_MOTIF_MISMATCH'),
        result('UNAVAILABLE', [], 'FUTURE_SOURCE_STATE')
      ),
    ])

    expect(screen.getByText('No matching component')).not.toBeNull()
    expect(screen.getByText('Overlapping locus only')).not.toBeNull()
    expect(screen.getByText('Repeat unit differs')).not.toBeNull()
    expect(screen.getByText('Future source state')).not.toBeNull()
    expect(screen.getByTitle('Reason code: REGION_EQUAL_MOTIF_MISMATCH')).not.toBeNull()

    const mismatch = within(screen.getByRole('row', { name: /DIAGNOSTIC2/ }))
    fireEvent.click(mismatch.getAllByText('Match details')[0])
    expect(mismatch.getByText('REGION_EQUAL_MOTIF_MISMATCH')).not.toBeNull()
  })

  test('filters searchable provenance fields and distinct match categories, resetting the page', () => {
    const pagedRows = Array.from({ length: 55 }, (_, index) => ({
      ...rows[0],
      short_record: {
        ...rows[0].short_record,
        id: `LOCUS${String(index + 1).padStart(2, '0')}`,
        gene: { symbol: `GENE${index + 1}` },
      },
    }))
    renderPage(pagedRows)

    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 2')).not.toBeNull()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'GENE55' },
    })
    expect(screen.getByText('Page 1 of 1')).not.toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/^1 matching loci/)
    expect(screen.getByRole('row', { name: /LOCUS55/ })).not.toBeNull()

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'no such locus' },
    })
    expect(screen.getByText('No known STR loci match these filters.')).not.toBeNull()
  })

  test('supports chromosome, status, and natural genomic/motif sorts without selecting a candidate', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText('Match status'), { target: { value: 'multiple' } })
    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(1)
    expect(screen.getByRole('row', { name: /MULTI/ })).not.toBeNull()
    expect(screen.getAllByLabelText('HGSVC/HPRC candidate loci')).toHaveLength(1)
    expect(screen.getAllByLabelText('HGSVC/HPRC candidate loci')[0].children).toHaveLength(2)
    expect(
      within(screen.getByRole('row', { name: /MULTI/ })).getAllByRole('link', {
        name: /Open HGSVC\/HPRC LR locus:/,
      })
    ).toHaveLength(2)

    fireEvent.change(screen.getByLabelText('Match status'), {
      target: { value: 'unavailable_ambiguous' },
    })
    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(2)

    fireEvent.change(screen.getByLabelText('Chromosome'), { target: { value: '2' } })
    expect(screen.getAllByTestId('long-read-tr-reference-row')).toHaveLength(1)
    expect(screen.getByRole('row', { name: /OFFLINE/ })).not.toBeNull()
  })
})
