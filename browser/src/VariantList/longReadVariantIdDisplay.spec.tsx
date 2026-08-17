import React from 'react'
import { render, screen } from '@testing-library/react'

import mergeLongReadVariants from './mergeLongReadVariants'
import variantTableColumns from './variantTableColumns'

jest.mock('../Link', () => ({ children, to }: any) => <a href={to}>{children}</a>)

describe('merged long-read variant ID display', () => {
  test('keeps a LR-only row ID canonical while normalizing its displayed link text', () => {
    const rawId = 'chr22-20077152-DEL-7~2'
    const [row] = mergeLongReadVariants<{ variant_id: string }>(
      [],
      [
        {
          variant_id: rawId,
          lr_cohort: 'aou',
          chrom: 'chr22',
          pos: 20077152,
          end: 20077159,
          length: -7,
          ref: 'ACGTACGT',
          alt: 'A',
          allele_type: 'del',
          freq: { all: { ac: 2, an: 100, af: 0.02 }, populations: [] },
        },
      ]
    )

    expect(row.variant_id).toBe(rawId)

    const idColumn = variantTableColumns.find((column) => column.key === 'variant_id')!
    render(<>{idColumn.render(row, 'variant_id', { highlightWords: [] })}</>)

    const link = screen.getByRole('link', { name: '22-20077152-DEL-7~2' })
    expect(link.getAttribute('href')).toBe(`/variant/${rawId}?dataset=gnomad_r4_lr&lr_cohort=aou`)
    expect(screen.queryByText(rawId)).toBeNull()
  })
})
