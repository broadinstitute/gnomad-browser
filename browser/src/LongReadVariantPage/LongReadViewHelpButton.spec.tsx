import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import LongReadViewHelpButton, { AOU_SUMMARY_ONLY_MESSAGE } from './LongReadViewHelpButton'

describe('LongReadViewHelpButton', () => {
  test('places the AoU summary-only notice inside the view help control', () => {
    render(<LongReadViewHelpButton maxHaplotypeRegionSize={100_000} />)

    expect(screen.queryByText(AOU_SUMMARY_ONLY_MESSAGE)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Long Read Data Views' }))

    expect(screen.getByRole('dialog', { name: 'Long Read Data Views' })).not.toBeNull()
    expect(screen.getByText(AOU_SUMMARY_ONLY_MESSAGE)).not.toBeNull()
  })
})
