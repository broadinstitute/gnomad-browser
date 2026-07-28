import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'

import LongReadViewControls from './LongReadViewControls'

describe('LongReadViewControls', () => {
  test('places the cohort control immediately before the view selector and switches both', () => {
    const onChangeCohort = jest.fn()
    const onChangeShowHaplotypes = jest.fn()
    render(
      <LongReadViewControls
        cohort="hgsvc_hprc"
        onChangeCohort={onChangeCohort}
        showHaplotypes={false}
        haplotypesDisabled={false}
        onChangeShowHaplotypes={onChangeShowHaplotypes}
      />
    )

    const controls = screen.getByTestId('long-read-view-controls')
    const cohortGroup = within(controls).getByRole('group', { name: 'Long-read cohort:' })
    const summaryView = within(controls).getByRole('radio', { name: 'Summary View' })
    expect(
      cohortGroup.compareDocumentPosition(summaryView) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    fireEvent.click(within(cohortGroup).getByRole('radio', { name: 'All of Us' }))
    expect(onChangeCohort).toHaveBeenCalledWith('aou')

    fireEvent.click(within(controls).getByRole('radio', { name: 'Haplotype View' }))
    expect(onChangeShowHaplotypes).toHaveBeenCalledWith(true)
  })

  test('keeps Haplotype View disabled for a summary-only cohort', () => {
    render(
      <LongReadViewControls
        cohort="aou"
        onChangeCohort={() => {}}
        showHaplotypes={false}
        haplotypesDisabled
        onChangeShowHaplotypes={() => {}}
      />
    )

    expect(
      (screen.getByRole('radio', { name: 'Haplotype View' }) as HTMLInputElement).disabled
    ).toBe(true)
  })
})
