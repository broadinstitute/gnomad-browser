import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { jest } from '@jest/globals'

import { longReadAncestryGroupDisplayName } from '../LongReadVariantPage/longReadAncestryGroups'
import ShortTandemRepeatPopulationOptions from './ShortTandemRepeatPopulationOptions'

describe('ShortTandemRepeatPopulationOptions LR display adapter', () => {
  test('shows oth and rmi as Remaining individuals while selecting the raw ID', () => {
    const setSelectedPopulation = jest.fn()

    render(
      <ShortTandemRepeatPopulationOptions
        id="lr-test"
        populations={['oth', 'rmi']}
        selectedPopulation={null}
        selectedSex={null}
        setSelectedPopulation={setSelectedPopulation}
        setSelectedSex={jest.fn()}
        ancestryGroupName={longReadAncestryGroupDisplayName}
      />
    )

    const select = screen.getByLabelText(/Genetic ancestry group/)
    const options = screen.getAllByRole('option', { name: 'Remaining individuals' })
    expect(options.map((option) => option.getAttribute('value'))).toEqual(['oth', 'rmi'])

    fireEvent.change(select, { target: { value: 'oth' } })
    expect(setSelectedPopulation).toHaveBeenCalledWith('oth')
  })
})
