import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import LongReadCohortSelector from './LongReadCohortSelector'

describe('LongReadCohortSelector', () => {
  test('presents accessible radio options and switches cohorts', () => {
    const onChange = jest.fn()
    render(<LongReadCohortSelector value="hgsvc_hprc" onChange={onChange} />)

    expect(screen.getByRole('group', { name: 'Long-read cohort:' })).not.toBeNull()
    expect((screen.getByRole('radio', { name: 'HGSVC/HPRC' }) as HTMLInputElement).checked).toBe(
      true
    )
    expect((screen.getByRole('radio', { name: 'All of Us' }) as HTMLInputElement).checked).toBe(
      false
    )

    fireEvent.click(screen.getByRole('radio', { name: 'All of Us' }))
    expect(onChange).toHaveBeenCalledWith('aou')
  })
})
