import React from 'react'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import mitochondrialVariantFactory from '../../src/__factories__/MitochondrialVariant'
import MitochondrialVariantHaplogroupFrequenciesTable from './MitochondrialVariantHaplogroupFrequenciesTable'

describe('MitochondrialVariantHaplogroupFrequenciesTable', () => {
  const variant = mitochondrialVariantFactory.build({
    haplogroups: [
      {
        id: 'A',
        ac_het: 5,
        ac_hom: 7,
        an: 123,
      },
      { id: 'B', ac_het: 0, ac_hom: 0, an: 234 },
      { id: 'C', ac_het: 13, ac_hom: 17, an: 456 },
    ],
  })

  test('shows AC for rendered haplotypes, AN for all haplotypes, and AF baced on rendered AC divided by total AN', async () => {
    render(<MitochondrialVariantHaplogroupFrequenciesTable variant={variant} />)

    const expectedTotalRowContent = [
      'Total (shown haplotypes)',
      '813',
      '24',
      '0.02952',
      '18',
      '0.02214',
    ].join('')
    const rows = await screen.findAllByRole('row')
    const totalRow = rows[rows.length - 1]
    expect(totalRow.textContent).toEqual(expectedTotalRowContent)
  })
})
