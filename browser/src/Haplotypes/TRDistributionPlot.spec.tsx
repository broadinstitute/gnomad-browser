import React from 'react'
import { render, screen } from '@testing-library/react'

import TRDistributionPlot from './TRDistributionPlot'

describe('TRDistributionPlot', () => {
  test('renders the compact non-interactive track-tooltip distribution', () => {
    const { container } = render(
      <TRDistributionPlot
        compact
        interactive={false}
        distribution={[
          { length_diff: -4, pop: 'N/A', count: 2 },
          { length_diff: 7, pop: 'N/A', count: 3 },
        ]}
      />
    )

    expect(screen.getByLabelText('TR allele length distribution')).toHaveAttribute('height', '58')
    expect(container.querySelectorAll('rect')).toHaveLength(2)
    expect(container.textContent).toContain('-4')
    expect(container.textContent).toContain('+7')
  })
})
