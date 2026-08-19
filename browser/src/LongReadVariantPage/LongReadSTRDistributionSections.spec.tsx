import React from 'react'
import { render, screen } from '@testing-library/react'

import ShortTandemRepeatAlleleSizeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import { consolidateAlleleSizeDistributions } from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  genotypeCountExtent,
  LongReadGenotypeDistributionSection,
  longReadAlleleSizeColorBy,
  longReadPopulationDisplayConfig,
  observedRepeatDomain,
} from './LongReadSTRDistributionSections'

describe('long-read STR allele-size distribution', () => {
  test('focuses domains on all observed counts with stable padding, including one-bin and outlier cases', () => {
    expect(observedRepeatDomain([])).toEqual([0, 0])
    expect(observedRepeatDomain([11])).toEqual([10, 12])
    expect(observedRepeatDomain([10, 11, 12, 200])).toEqual([9, 201])
    expect(observedRepeatDomain([0])).toEqual([0, 1])
  })

  test('explains heatmap squares and provides a selected-view individual count legend', () => {
    const distribution = [
      {
        ancestry_group: 'afr',
        sex: 'XX' as const,
        short_allele_repunit: 'T',
        long_allele_repunit: 'T',
        distribution: [
          {
            short_allele_repunit_count: 10,
            long_allele_repunit_count: 11,
            frequency: 2,
          },
          {
            short_allele_repunit_count: 11,
            long_allele_repunit_count: 11,
            frequency: 20,
          },
        ],
      },
    ]
    render(
      <LongReadGenotypeDistributionSection
        variantId="heatmap-test"
        genotypeDistribution={distribution}
        repeatUnit="T"
        focusObservedDomain
        explainGenotypes
      />
    )
    expect(screen.getByText(/Each square is a shorter\/longer allele pair/)).not.toBeNull()
    expect(screen.getByText(/Hover a square for its exact repeat pair and count/)).not.toBeNull()
    expect(screen.getByLabelText('Genotype count legend: 2 to 20 individuals')).not.toBeNull()
  })

  test('count legend combines duplicate repeat pairs without changing counts', () => {
    expect(
      genotypeCountExtent([
        {
          short_allele_repunit_count: 10,
          long_allele_repunit_count: 11,
          frequency: 2,
        },
        {
          short_allele_repunit_count: 10,
          long_allele_repunit_count: 11,
          frequency: 3,
        },
        {
          short_allele_repunit_count: 11,
          long_allele_repunit_count: 11,
          frequency: 20,
        },
      ])
    ).toEqual([5, 20])
  })

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
      />
    )

    expect(screen.getAllByText('Remaining individuals').length).toBeGreaterThan(0)
    const rmiBars = Array.from(container.querySelectorAll('rect[stroke="black"][fill="#ABB8B9"]'))
    expect(rmiBars.some((bar) => Number(bar.getAttribute('height')) > 0)).toBe(true)
  })
})
