import React from 'react'
import { render, screen } from '@testing-library/react'

import ShortTandemRepeatAlleleSizeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import { consolidateAlleleSizeDistributions } from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  longReadAlleleSizeColorBy,
  longReadPopulationDisplayConfig,
} from './LongReadSTRDistributionSections'

describe('long-read STR allele-size distribution', () => {
  test('renders raw rmi as Remaining individuals while preserving its filter/data identity', () => {
    const distribution = consolidateAlleleSizeDistributions(
      [
        {
          ancestry_group: 'rmi',
          sex: 'XX',
          repunit: 'CAG',
          distribution: [{ repunit_count: 3, frequency: 7, colorByValue: null }],
        },
        {
          ancestry_group: 'afr',
          sex: 'XX',
          repunit: 'CAG',
          distribution: [{ repunit_count: 3, frequency: 11, colorByValue: null }],
        },
      ],
      longReadAlleleSizeColorBy,
      'rmi',
      null,
      'population',
      null,
      null
    )

    expect(distribution).toEqual([{ repunit_count: 3, frequency: 7, colorByValue: 'rmi' }])

    const { container } = render(
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={5}
        alleleSizeDistribution={distribution}
        colorBy="population"
        repeatUnitLength={null}
        repeatUnit="CAG"
        scaleType="linear"
        populationDisplayConfig={longReadPopulationDisplayConfig}
        size={{ width: 600 }}
      />
    )

    expect(screen.getAllByText('Remaining individuals').length).toBeGreaterThan(0)
    const rmiBars = Array.from(container.querySelectorAll('rect[stroke="black"][fill="#ABB8B9"]'))
    expect(rmiBars.some((bar) => Number(bar.getAttribute('height')) > 0)).toBe(true)
  })
})
