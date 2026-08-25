import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { LONG_READ_PRIMARY_PLOT_COLOR } from '../LongReadPlotTheme'
import ShortTandemRepeatAlleleSizeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatAlleleSizeDistributionPlot'
import ShortTandemRepeatGenotypeDistributionPlot from '../ShortTandemRepeatPage/ShortTandemRepeatGenotypeDistributionPlot'
import { consolidateAlleleSizeDistributions } from '../ShortTandemRepeatPage/shortTandemRepeatHelpers'
import {
  genotypeCountExtent,
  LongReadAlleleSizeDistributionSection,
  LongReadGenotypeDistributionSection,
  longReadAlleleSizeColorBy,
  longReadPopulationDisplayConfig,
  observedRepeatDomain,
} from './LongReadSTRDistributionSections'

describe('long-read STR allele-size distribution', () => {
  test('uses LR purple through optional plot themes while short-read defaults stay green', () => {
    const alleleCohorts = [
      {
        ancestry_group: 'afr' as const,
        sex: 'XX' as const,
        repunit: 'T',
        distribution: [{ repunit_count: 10, frequency: 7, colorByValue: null }],
      },
    ]
    const genotypeCohorts = [
      {
        ancestry_group: 'afr',
        sex: 'XX' as const,
        short_allele_repunit: 'T',
        long_allele_repunit: 'T',
        distribution: [
          { short_allele_repunit_count: 10, long_allele_repunit_count: 11, frequency: 7 },
        ],
      },
    ]

    const lrAlleles = render(
      <LongReadAlleleSizeDistributionSection
        variantId="lr-theme-alleles"
        alleleSizeDistribution={alleleCohorts}
        maxRepunits={12}
      />
    )
    expect(
      lrAlleles.container.querySelector(`rect[fill="${LONG_READ_PRIMARY_PLOT_COLOR}"]`)
    ).not.toBeNull()
    lrAlleles.unmount()

    const srAlleles = render(
      <ShortTandemRepeatAlleleSizeDistributionPlot
        maxRepeats={12}
        alleleSizeDistribution={alleleCohorts[0].distribution}
        colorBy={null}
        repeatUnitLength={null}
        scaleType="linear"
      />
    )
    expect(srAlleles.container.querySelector('rect[fill="#73ab3d"]')).not.toBeNull()
    srAlleles.unmount()

    const lrGenotypes = render(
      <LongReadGenotypeDistributionSection
        variantId="lr-theme-genotypes"
        genotypeDistribution={genotypeCohorts}
      />
    )
    expect(
      lrGenotypes.container.querySelector(`rect[fill="${LONG_READ_PRIMARY_PLOT_COLOR}"]`)
    ).not.toBeNull()
    lrGenotypes.unmount()

    const srGenotypes = render(
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={['longer allele', 'shorter allele']}
        maxRepeats={[12, 12]}
        genotypeDistribution={genotypeCohorts[0].distribution}
        xRanges={[]}
        yRanges={[]}
        onSelectBin={() => {}}
        selectedPopulation={null}
        selectedSex={null}
      />
    )
    expect(srGenotypes.container.querySelector('rect[fill="#73ab3d"]')).not.toBeNull()
  })

  test('adds one optional keyboard target per stacked allele bin without changing the static default', () => {
    const distribution = [
      { repunit_count: 10, frequency: 3, colorByValue: 'afr' as const },
      { repunit_count: 10, frequency: 4, colorByValue: 'nfe' as const },
    ]
    const onSelectBin = jest.fn()
    const interactive = render(
      <ShortTandemRepeatAlleleSizeDistributionPlot
        minRepeats={10}
        maxRepeats={10}
        alleleSizeDistribution={distribution}
        colorBy="population"
        repeatUnitLength={null}
        scaleType="linear"
        onSelectBin={onSelectBin}
        isBinSelected={(bin) => bin.start === 10}
      />
    )
    const bars = screen.getAllByRole('button', { name: /Filter by 10 repeats.*7 alleles/ })
    expect(bars).toHaveLength(1)
    const [bar] = bars
    expect(bar.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bar)
    fireEvent.keyDown(bar, { key: 'Enter' })
    fireEvent.keyDown(bar, { key: ' ' })
    expect(onSelectBin).toHaveBeenCalledTimes(3)
    expect(onSelectBin.mock.calls[0][0]).toMatchObject({ start: 10, stop: 10, fullFrequency: 7 })
    interactive.unmount()

    render(
      <ShortTandemRepeatAlleleSizeDistributionPlot
        minRepeats={10}
        maxRepeats={10}
        alleleSizeDistribution={distribution}
        colorBy="population"
        repeatUnitLength={null}
        scaleType="linear"
      />
    )
    expect(screen.queryByRole('button', { name: /Filter by 10 repeats/ })).toBeNull()
  })

  test('adds optional keyboard genotype-bin activation and selected semantics', () => {
    const onSelectBin = jest.fn()
    const distribution = [
      { short_allele_repunit_count: 10, long_allele_repunit_count: 11, frequency: 7 },
    ]
    const interactive = render(
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={['longer allele', 'shorter allele']}
        minRepeats={[11, 10]}
        maxRepeats={[11, 10]}
        genotypeDistribution={distribution}
        xRanges={[]}
        yRanges={[]}
        onSelectBin={onSelectBin}
        isBinSelected={() => true}
        selectedPopulation={null}
        selectedSex={null}
      />
    )
    const cell = screen.getByRole('button', {
      name: /11 repeats in longer allele.*10 repeats in shorter allele.*7 individuals/,
    })
    expect(cell.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(cell)
    fireEvent.keyDown(cell, { key: 'Enter' })
    fireEvent.keyDown(cell, { key: ' ' })
    expect(onSelectBin).toHaveBeenCalledTimes(3)
    expect(onSelectBin.mock.calls[0][0]).toMatchObject({ xRange: [11, 11], yRange: [10, 10] })
    interactive.unmount()

    render(
      <ShortTandemRepeatGenotypeDistributionPlot
        axisLabels={['longer allele', 'shorter allele']}
        minRepeats={[11, 10]}
        maxRepeats={[11, 10]}
        genotypeDistribution={distribution}
        xRanges={[]}
        yRanges={[]}
        selectedPopulation={null}
        selectedSex={null}
      />
    )
    expect(screen.queryByRole('button', { name: /11 repeats in longer allele/ })).toBeNull()
  })

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
