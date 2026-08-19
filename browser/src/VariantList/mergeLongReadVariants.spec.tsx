import React from 'react'
import { render, screen } from '@testing-library/react'

import { exportVariantsToCsv } from './ExportVariantsButton'
import mergeCallsetData from './mergeCallsetData'
import mergeLongReadVariants, { RawLongReadVariant } from './mergeLongReadVariants'
import variantTableColumns, { getColumnsForContext } from './variantTableColumns'

jest.mock('../Link', () => ({ children, to, ...rest }: any) => (
  <a href={to} {...rest}>
    {children}
  </a>
))

const httLocus =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'
const httSource = 'chr4-3074876-TRV-164'

const trAllele = (overrides: Partial<RawLongReadVariant> = {}): RawLongReadVariant => ({
  variant_id: 'chr4-3074876-TRV-164~1',
  source_variant_id: httSource,
  alt_index: 1,
  alt_count: 1,
  lr_cohort: 'hgsvc_hprc',
  chrom: '4',
  pos: 3074876,
  end: 3075040,
  ref: 'CAG',
  alt: 'CAGCAG',
  allele_type: 'trv',
  is_likely_tr: true,
  tr_locus_id: httLocus,
  filters: [],
  freq: { all: { ac: 1, an: 584, af: 1 / 584 }, populations: [] },
  ...overrides,
})

const idColumn = variantTableColumns.find((column) => column.key === 'variant_id')!

describe('exact LR tandem-repeat loci in standard variant tables', () => {
  test("collapses HTT's 72 HGSVC/HPRC ALTs into one honest locus row and canonical link", () => {
    const alleles = Array.from({ length: 72 }, (_, index) => {
      const ac = index === 0 ? 485 : 1
      return trAllele({
        variant_id: `${httSource}~${index + 1}`,
        alt_index: index + 1,
        alt_count: 72,
        freq: { all: { ac, an: 584, af: ac / 584 }, populations: [] },
      })
    })

    const rows: any[] = mergeLongReadVariants([], alleles, { geneSymbol: 'HTT' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      is_long_read_tr_locus: true,
      long_read_tr_locus_id: httLocus,
      long_read_tr_source_variant_id: httSource,
      long_read_tr_alt_count: 72,
      long_read_tr_label: 'HTT tandem-repeat locus',
      long_read_tr_aggregation_valid: true,
      consequence: null,
      hgvs: null,
    })
    expect(rows[0].long_read_alleles).toHaveLength(72)
    expect(rows[0].long_read).toMatchObject({ ac: 556, an: 584, af: 556 / 584 })
    expect(rows[0].long_read.homozygote_alt_count).toBeUndefined()

    const { container } = render(
      <>{idColumn.render(rows[0], 'variant_id', { highlightWords: [] })}</>
    )
    const link = screen.getByRole('link', { name: /HTT tandem-repeat locus; 72 exact ALT alleles/ })
    expect(link.getAttribute('href')).toBe(
      `/tandem-repeat/${httLocus}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(container.querySelectorAll('a')).toHaveLength(1)
    expect(container.querySelector('div, br')).toBeNull()
    expect(container.textContent).toBe('HTT tandem-repeat locusTR')

    const geneColumns: any = getColumnsForContext(
      { gene_id: 'ENSG00000197386', mane_select_transcript: { ensembl_id: 'ENST00000355072' } },
      'gnomad_r4'
    )
    const hgvs = render(<>{geneColumns.hgvs.render(rows[0], 'hgvs', { highlightWords: [] })}</>)
    expect(hgvs.container.textContent).toBe('Unavailable for locus')
    expect(hgvs.container.textContent).not.toContain('†')
  })

  test('uses a canonical one-component locus link and coordinate/motif fallback label', () => {
    const locus = '4-3208719-3208734-A'
    const row: any = mergeLongReadVariants(
      [],
      [
        trAllele({
          variant_id: 'chr4-3208719-TRV-15~1',
          source_variant_id: 'chr4-3208719-TRV-15',
          tr_locus_id: locus,
          pos: 3208719,
          end: 3208734,
        }),
      ]
    )[0]
    expect(row.long_read_tr_label).toBe('4:3,208,720–3,208,734 A tandem-repeat locus')

    render(<>{idColumn.render(row, 'variant_id', { highlightWords: [] })}</>)
    expect(screen.getByRole('link').getAttribute('href')).toBe(
      `/tandem-repeat/${locus}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
  })

  test('keeps distinct same-position authoritative loci and component layouts separate', () => {
    const rows: any[] = mergeLongReadVariants(
      [],
      [
        trAllele({
          variant_id: 'source-a~1',
          source_variant_id: 'source-a',
          tr_locus_id: '4-100-110-CAG',
          pos: 100,
        }),
        trAllele({
          variant_id: 'source-a-layout-2~1',
          source_variant_id: 'source-a',
          tr_locus_id: '4-100-105-CAG+4-105-110-CAA',
          pos: 100,
        }),
      ]
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.long_read_tr_locus_id)).toEqual([
      '4-100-110-CAG',
      '4-100-105-CAG+4-105-110-CAA',
    ])
  })

  test('keeps cohort ownership in the exact grouping identity', () => {
    const rows: any[] = mergeLongReadVariants(
      [],
      [trAllele(), trAllele({ variant_id: `${httSource}~aou-1`, lr_cohort: 'aou' })]
    )
    expect(rows).toHaveLength(2)
    expect(rows.map((row) => row.lr_cohort)).toEqual(['hgsvc_hprc', 'aou'])
  })

  test('fails AC/AN/AF closed for inconsistent denominators', () => {
    const row: any = mergeLongReadVariants(
      [],
      [
        trAllele({ alt_index: 1, alt_count: 2 }),
        trAllele({
          variant_id: `${httSource}~2`,
          alt_index: 2,
          alt_count: 2,
          freq: { all: { ac: 2, an: 582, af: 2 / 582 }, populations: [] },
        }),
      ]
    )[0]
    expect(row.long_read).toMatchObject({ ac: null, an: null, af: null })
    expect(row.long_read_tr_aggregation_valid).toBe(false)

    const merged: any = mergeCallsetData({ datasetId: 'gnomad_r4', variants: [row] })[0]
    expect(merged).toMatchObject({ ac: null, an: null, af: null, ac_hom: null, ac_hemi: null })
  })

  test('preserves non-TR LR-only rows and only groups exact authoritative identities', () => {
    const nonTr = trAllele({
      variant_id: 'chr4-100-A-G~1',
      source_variant_id: 'chr4-100-A-G',
      allele_type: 'snv',
      is_likely_tr: false,
      tr_locus_id: null,
      pos: 100,
      ref: 'A',
      alt: 'G',
    })
    const trWithoutTrid = trAllele({
      variant_id: 'opaque-tr~1',
      tr_locus_id: null,
    })
    const rows: any[] = mergeLongReadVariants([], [nonTr, trWithoutTrid])
    expect(rows.map((row) => row.variant_id)).toEqual(['chr4-100-A-G~1', 'opaque-tr~1'])
    expect(rows.every((row) => !row.is_long_read_tr_locus)).toBe(true)
  })

  test('search retains locus, source, label, and every exact child allele identity', () => {
    const row: any = mergeLongReadVariants(
      [],
      [
        trAllele({ alt_index: 1, alt_count: 2 }),
        trAllele({ variant_id: `${httSource}~2`, alt_index: 2, alt_count: 2 }),
      ],
      { geneSymbol: 'HTT' }
    )[0]
    const terms = idColumn.getSearchTerms!(row)
    expect(terms).toEqual(
      expect.arrayContaining([httLocus, httSource, 'HTT tandem-repeat locus', `${httSource}~2`])
    )
  })

  test('CSV export identifies the summary locus and preserves exact child IDs', () => {
    const row: any = mergeCallsetData({
      datasetId: 'gnomad_r4',
      variants: [
        mergeLongReadVariants(
          [],
          [
            trAllele({ alt_index: 1, alt_count: 2 }),
            trAllele({ variant_id: `${httSource}~2`, alt_index: 2, alt_count: 2 }),
          ],
          { geneSymbol: 'HTT' }
        )[0],
      ],
    })[0]
    const blob = jest.fn((parts: string[]) => ({ parts }))
    const originalBlob = global.Blob
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    ;(global as any).Blob = blob
    URL.createObjectURL = jest.fn(() => 'blob:test')
    URL.revokeObjectURL = jest.fn()

    try {
      exportVariantsToCsv([row], 'gnomad_r4', 'htt')
      const csv = blob.mock.calls[0][0][0]
      expect(csv).toContain('Long-read TR locus ID')
      expect(csv).toContain('Long-read TR locus loaded ALT count')
      expect(csv).toContain(httLocus)
      expect(csv).toContain(`${httSource}~1;${httSource}~2`)
      expect(csv).toContain(`,${httSource},2,`)
    } finally {
      click.mockRestore()
      global.Blob = originalBlob
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
  })
})
