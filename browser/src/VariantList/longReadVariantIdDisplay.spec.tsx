import React from 'react'
import { render, screen } from '@testing-library/react'

import mergeLongReadVariants from './mergeLongReadVariants'
import variantTableColumns from './variantTableColumns'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

describe('merged long-read variant ID display', () => {
  test('shows the reported tandem duplication compactly without changing its canonical link', () => {
    const canonicalId = 'chr22-50715763-DUP_TANDEM-49~1'
    const alt = 'CGCTGTGGGGCTGCATGGGGTGGGGAGGAACGGGGCTGGGGTATGGCTGG'
    const row: any = mergeLongReadVariants(
      [],
      [
        {
          variant_id: canonicalId,
          source_variant_id: 'chr22-50715763-DUP_TANDEM-49',
          alt_index: 1,
          alt_count: 1,
          lr_cohort: 'hgsvc_hprc' as const,
          chrom: 'chr22',
          pos: 50715763,
          end: 50715812,
          length: 49,
          ref: 'C',
          alt,
          allele_type: 'dup_tandem',
          freq: { all: { ac: 1, an: 10, af: 0.1 }, populations: [] },
        },
      ]
    )[0]
    const idColumn = variantTableColumns.find((column) => column.key === 'variant_id')!
    const { container } = render(<>{idColumn.render(row, 'variant_id', { highlightWords: [] })}</>)

    const link = screen.getByRole('link', {
      name: '22:50715763 tandem duplication +49 bp',
    })
    expect(link.getAttribute('href')).toBe(
      `/variant/${canonicalId}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    expect(container.textContent).not.toContain(alt)
    expect(row.variant_id).toBe(canonicalId)
  })

  test('normalizes LR-only TR row labels on a short-read table without changing IDs or links', () => {
    const shortReadIds = ['1-55039879-A-ACTGCTG', '1-55039879-ACTG-A']
    const rawLongReadIds = [
      'chr1-55039879-TRV-27~1',
      'chr1-55039879-TRV-27~2',
      'chr1-55039879-TRV-27~3',
    ]
    const rows = mergeLongReadVariants(
      shortReadIds.map((variantId) => ({ variant_id: variantId })),
      rawLongReadIds.map((variantId, index) => ({
        variant_id: variantId,
        source_variant_id: 'chr1-55039879-TRV-27',
        alt_index: index + 1,
        alt_count: 3,
        lr_cohort: 'aou' as const,
        chrom: 'chr1',
        pos: 55039879,
        end: 55039906,
        length: 27,
        ref: 'A',
        alt: '<TR>',
        allele_type: 'trv',
        freq: { all: { ac: 2, an: 100, af: 0.02 }, populations: [] },
      }))
    )

    expect(rows.map((row) => row.variant_id)).toEqual([...shortReadIds, ...rawLongReadIds])

    const idColumn = variantTableColumns.find((column) => column.key === 'variant_id')!
    render(
      <>
        {rows.map((row) => (
          <React.Fragment key={row.variant_id}>
            {idColumn.render(row, 'variant_id', { highlightWords: [] })}
          </React.Fragment>
        ))}
      </>
    )

    shortReadIds.forEach((variantId) => {
      expect(screen.getByRole('link', { name: variantId }).getAttribute('href')).toBe(
        `/variant/${variantId}`
      )
    })

    const compactLinks = screen.getAllByRole('link', {
      name: '1:55039879 tandem-repeat allele +27 bp',
    })
    rawLongReadIds.forEach((rawId, index) => {
      expect(compactLinks[index].getAttribute('href')).toBe(
        `/variant/${rawId}?dataset=gnomad_r4_lr&lr_cohort=aou`
      )
      expect(screen.getByText(`ALT ${index + 1} of 3`)).not.toBeNull()
      expect(screen.queryByText(rawId)).toBeNull()
    })
  })

  test('keeps a matched short-read link primary and exposes every canonical LR ALT link', () => {
    const srId = '1-100-G-A'
    const rows = mergeLongReadVariants(
      [{ variant_id: srId }],
      ['A', 'T'].map((alt, index) => ({
        variant_id: `opaque-record~${index + 1}`,
        source_variant_id: 'opaque-record',
        alt_index: index + 1,
        alt_count: 2,
        lr_cohort: 'hgsvc_hprc' as const,
        chrom: '1',
        pos: 100,
        end: 100,
        length: 0,
        ref: 'G',
        alt,
        allele_type: 'snv',
        short_read_match_id: srId,
        freq: { all: { ac: 1, an: 10, af: 0.1 }, populations: [] },
      }))
    )
    const row = rows[0] as any
    expect(row.variant_id).toBe(srId)
    expect(row.lr_cohort).toBeUndefined()
    expect(row.long_read_alleles.map((allele: any) => allele.variant_id)).toEqual([
      'opaque-record~1',
      'opaque-record~2',
    ])

    const idColumn = variantTableColumns.find((column) => column.key === 'variant_id')!
    const { container } = render(<>{idColumn.render(row, 'variant_id', { highlightWords: [] })}</>)

    expect(container.querySelector('div')).toBeNull()
    expect(
      Array.from(container.querySelectorAll('span')).filter(
        (element) => element.style.whiteSpace === 'nowrap'
      )
    ).toHaveLength(2)
    expect(screen.getByRole('link', { name: srId }).getAttribute('href')).toBe(`/variant/${srId}`)
    expect(screen.getByRole('link', { name: 'LR ALT 1 of 2' }).getAttribute('href')).toBe(
      '/variant/opaque-record~1?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'
    )
    expect(screen.getByRole('link', { name: 'LR ALT 2 of 2' }).getAttribute('href')).toBe(
      '/variant/opaque-record~2?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'
    )
  })
})
