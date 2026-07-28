import React from 'react'
import { render, screen } from '@testing-library/react'

import { VariantColorLegend, VariantShapeLegend } from './VariantLegend'
import { GNOMAD_SV_CLASS_COLORS } from './variantUtils'

describe('long-read variant legends', () => {
  test('shows every gnomAD SV class color in the summary legend', () => {
    const { container } = render(<VariantColorLegend />)

    const labels = ['Deletion', 'Duplication', 'MCNV', 'Insertion', 'Inversion', 'Complex', 'Other / breakend']
    labels.forEach((label) => {
      expect(screen.getByText(label)).not.toBeNull()
    })
    Object.values(GNOMAD_SV_CLASS_COLORS).forEach((color) => {
      expect(container.querySelector(`[fill="${color}"]`) || container.querySelector(`[stroke="${color}"]`)).not.toBeNull()
    })
  })

  test('uses the shared palette in representative bubble-track shapes', () => {
    const { container } = render(<VariantShapeLegend plotType="bubble" />)

    expect(container.querySelector(`[stroke="${GNOMAD_SV_CLASS_COLORS.DEL}"]`)).not.toBeNull()
    expect(container.querySelector(`[fill="${GNOMAD_SV_CLASS_COLORS.INS}"]`)).not.toBeNull()
    expect(container.querySelector(`[fill="${GNOMAD_SV_CLASS_COLORS.DUP}"]`)).not.toBeNull()
  })
})
