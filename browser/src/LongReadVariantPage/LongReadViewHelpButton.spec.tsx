import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import LongReadViewHelpButton, { AOU_SUMMARY_ONLY_MESSAGE } from './LongReadViewHelpButton'

describe('LongReadViewHelpButton', () => {
  test('places the AoU summary-only notice inside the view help control', () => {
    render(<LongReadViewHelpButton />)

    expect(screen.queryByText(AOU_SUMMARY_ONLY_MESSAGE)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Long Read Data Views' }))

    const dialog = screen.getByRole('dialog', { name: 'Long Read Data Views' })
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).not.toMatch(/limited to regions under/i)
    expect(screen.getByText(AOU_SUMMARY_ONLY_MESSAGE)).not.toBeNull()
  })
})
