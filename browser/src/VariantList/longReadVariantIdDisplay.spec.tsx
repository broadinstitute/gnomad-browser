import React from 'react'
import { render, screen } from '@testing-library/react'

import mergeLongReadVariants from './mergeLongReadVariants'
import variantTableColumns from './variantTableColumns'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

describe('merged long-read variant ID display', () => {
  test('normalizes LR-only TR row labels on a short-read table without changing IDs or links', () => {
    const shortReadIds = ['1-55039879-A-ACTGCTG', '1-55039879-ACTG-A']
    const rawLongReadIds = [
      'chr1-55039879-TRV-27~1',
      'chr1-55039879-TRV-27~2',
      'chr1-55039879-TRV-27~3',
    ]
    const rows = mergeLongReadVariants(
      shortReadIds.map((variantId) => ({ variant_id: variantId })),
      rawLongReadIds.map((variantId) => ({
        variant_id: variantId,
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

    rawLongReadIds.forEach((rawId) => {
      const displayId = rawId.replace(/^chr/, '')
      expect(screen.getByRole('link', { name: displayId }).getAttribute('href')).toBe(
        `/variant/${rawId}?dataset=gnomad_r4_lr&lr_cohort=aou`
      )
      expect(screen.queryByText(rawId)).toBeNull()
    })
  })
})
