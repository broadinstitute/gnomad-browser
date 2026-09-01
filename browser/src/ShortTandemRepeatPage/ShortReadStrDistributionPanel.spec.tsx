import React from 'react'
import 'jest-styled-components'
import { fireEvent, render, screen } from '@testing-library/react'

import ShortReadStrDistributionPanel from './ShortReadStrDistributionPanel'

jest.mock('@gnomad/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  Select: ({ children, ...props }: any) => <select {...props}>{children}</select>,
}))

jest.mock('./ShortTandemRepeatAlleleSizeDistributionPlot', () => ({
  __esModule: true,
  default: ({ alleleSizeDistribution, colorBy, ranges, repeatUnit, onSelectBin }: any) => (
    <div
      data-testid="short-allele-plot"
      data-repeat-unit={repeatUnit}
      data-color-by={colorBy || 'none'}
      data-ranges={JSON.stringify(ranges)}
      data-total={alleleSizeDistribution.reduce(
        (sum: number, item: any) => sum + item.frequency,
        0
      )}
      data-interactive={Boolean(onSelectBin)}
    />
  ),
}))

jest.mock('./ShortTandemRepeatGenotypeDistributionPlot', () => ({
  __esModule: true,
  default: ({ axisLabels, genotypeDistribution, onSelectBin, xRanges, yRanges }: any) => (
    <div
      data-testid="short-genotype-plot"
      data-axis-labels={axisLabels.join('|')}
      data-ranges={JSON.stringify([xRanges, yRanges])}
      data-total={genotypeDistribution.reduce((sum: number, item: any) => sum + item.frequency, 0)}
      data-interactive={Boolean(onSelectBin)}
    />
  ),
}))

const allele = {
  status: 'AVAILABLE' as const,
  reason_code: null,
  distributions: [
    {
      ancestry_group: 'nfe' as const,
      sex: 'XX' as const,
      repunit: 'CAG',
      quality_description: 'high' as const,
      q_score: '1' as const,
      distribution: [{ repunit_count: 18, frequency: 5, colorByValue: null }],
    },
    {
      ancestry_group: 'afr' as const,
      sex: 'XY' as const,
      repunit: 'CAG',
      quality_description: 'medium' as const,
      q_score: '0.8' as const,
      distribution: [{ repunit_count: 20, frequency: 3, colorByValue: null }],
    },
  ],
}

const genotype = {
  status: 'AVAILABLE' as const,
  reason_code: null,
  distributions: [
    {
      ancestry_group: 'nfe',
      sex: 'XX' as const,
      short_allele_repunit: 'CAG',
      long_allele_repunit: 'CAG',
      quality_description: 'high' as const,
      q_score: '1' as const,
      distribution: [
        { short_allele_repunit_count: 18, long_allele_repunit_count: 19, frequency: 2 },
      ],
    },
    {
      ancestry_group: 'afr',
      sex: 'XY' as const,
      short_allele_repunit: 'CAG',
      long_allele_repunit: 'CAG',
      quality_description: 'medium' as const,
      q_score: '0.8' as const,
      distribution: [
        { short_allele_repunit_count: 19, long_allele_repunit_count: 20, frequency: 2 },
      ],
    },
  ],
}

const huntington = {
  name: 'Huntington disease',
  symbol: 'HD',
  repeat_size_classifications: [
    { classification: 'Normal', min: null, max: 26 },
    { classification: 'Intermediate', min: 27, max: 35 },
    { classification: 'Pathogenic', min: 36, max: null },
  ],
  notes: 'Catalog note copied verbatim.',
}

const renderPanel = (props: Record<string, any> = {}) =>
  render(
    <ShortReadStrDistributionPanel
      id="HTT"
      motif="CAG"
      diseases={[huntington]}
      allele={allele}
      genotype={genotype}
      {...props}
    />
  )

describe('ShortReadStrDistributionPanel', () => {
  test('preserves H3 plot headings by default for classic short-read surfaces', () => {
    renderPanel()

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Short-read allele repeat-count distribution — CAG',
      })
    ).not.toBeNull()
    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Short-read genotype repeat-count distribution — CAG/CAG',
      })
    ).not.toBeNull()
  })

  test('supports H4 plot and unavailable-card headings when nested under an H3 subsection', () => {
    renderPanel({
      plotHeadingLevel: 4,
      allele: { status: 'UNAVAILABLE', reason_code: 'ALLELE_EMPTY', distributions: [] },
    })

    expect(
      screen.getByRole('heading', { level: 4, name: 'Allele-copy distribution' })
    ).not.toBeNull()
    expect(
      screen.getByRole('heading', {
        level: 4,
        name: 'Short-read genotype repeat-count distribution — CAG/CAG',
      })
    ).not.toBeNull()
  })

  test('shares short-only ancestry and sex filters, shows totals, and retains quality/color/scale controls', () => {
    renderPanel()

    expect(screen.getByText(/8 short-read allele copies/)).not.toBeNull()
    expect(screen.getAllByText(/4 people/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('short-allele-plot').getAttribute('data-total')).toBe('8')
    expect(screen.getByTestId('short-genotype-plot').getAttribute('data-total')).toBe('4')

    fireEvent.change(screen.getByLabelText(/Genetic ancestry group/), {
      target: { value: 'nfe' },
    })
    expect(screen.getByText(/5 short-read allele copies/)).not.toBeNull()
    expect(screen.getAllByText(/2 people/).length).toBeGreaterThan(0)
    expect(screen.getByTestId('short-allele-plot').getAttribute('data-total')).toBe('5')
    expect(screen.getByTestId('short-genotype-plot').getAttribute('data-total')).toBe('2')

    fireEvent.change(screen.getByLabelText(/Color by/), {
      target: { value: 'quality_description' },
    })
    expect(screen.getByTestId('short-allele-plot').getAttribute('data-color-by')).toBe(
      'quality_description'
    )
    expect(screen.getByLabelText(/y-Scale/)).not.toBeNull()
    expect(screen.getByRole('option', { name: 'GQ: Q score' })).not.toBeNull()
    expect(screen.getByRole('option', { name: 'Sex' })).not.toBeNull()

    expect(screen.getByTestId('short-allele-plot').getAttribute('data-interactive')).toBe('false')
    expect(screen.getByTestId('short-genotype-plot').getAttribute('data-interactive')).toBe('false')
  })

  test('does not infer adjacent HTT CCG rows into the admitted CAG panel', () => {
    renderPanel({
      allele: {
        ...allele,
        distributions: allele.distributions.map((cohort) => ({ ...cohort, repunit: 'CCG' })),
      },
      genotype: {
        ...genotype,
        distributions: genotype.distributions.map((cohort) => ({
          ...cohort,
          short_allele_repunit: 'CCG',
          long_allele_repunit: 'CCG',
        })),
      },
    })

    expect(screen.queryByTestId('short-allele-plot')).toBeNull()
    expect(screen.queryByTestId('short-genotype-plot')).toBeNull()
    expect(screen.getByText('Short-read allele-copy total unavailable')).not.toBeNull()
    expect(screen.getByText('Short-read people total unavailable')).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Allele-copy distribution' })).not.toBeNull()
    expect(screen.getByRole('heading', { name: 'Genotype distribution' })).not.toBeNull()
  })

  test('keeps exact ATXN1 TGC orientation in both plots', () => {
    const tgcAllele = {
      ...allele,
      distributions: allele.distributions.map((cohort) => ({ ...cohort, repunit: 'TGC' })),
    }
    const tgcGenotype = {
      ...genotype,
      distributions: genotype.distributions.map((cohort) => ({
        ...cohort,
        short_allele_repunit: 'TGC',
        long_allele_repunit: 'TGC',
      })),
    }
    renderPanel({ id: 'ATXN1', motif: 'TGC', allele: tgcAllele, genotype: tgcGenotype })

    expect(
      screen.getByRole('heading', { name: /allele repeat-count distribution — TGC/ })
    ).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: /genotype repeat-count distribution — TGC\/TGC/ })
    ).not.toBeNull()
    expect(screen.getByTestId('short-allele-plot').getAttribute('data-repeat-unit')).toBe('TGC')
    expect(screen.getByTestId('short-genotype-plot').getAttribute('data-axis-labels')).toBe(
      'longer TGC allele|shorter TGC allele'
    )
    expect(screen.queryByText(/CAG/)).toBeNull()
  })

  test.each([
    [
      'COMP',
      {
        name: 'Multiple epiphyseal dysplasia 1',
        symbol: 'EDM1',
        repeat_size_classifications: [{ classification: 'Pathogenic', min: 6, max: null }],
        notes: null,
      },
      {
        name: 'Pseudoachondroplasia',
        symbol: 'PSACH',
        repeat_size_classifications: [{ classification: 'Pathogenic', min: 7, max: null }],
        notes: '5 repeats are normal. Contractions to 4 repeats are also pathogenic.',
      },
    ],
    [
      'NOTCH2NLC',
      {
        name: 'Neuronal intranuclear inclusion disease',
        symbol: 'NIID',
        repeat_size_classifications: [
          { classification: 'Normal', min: null, max: 37 },
          { classification: 'Pathogenic', min: 66, max: null },
        ],
        notes: 'Source gap is intentionally preserved.',
      },
      {
        name: 'Essential tremor 6',
        symbol: 'ETM6',
        repeat_size_classifications: [
          { classification: 'Normal', min: null, max: 41 },
          { classification: 'Pathogenic', min: 60, max: null },
        ],
        notes: null,
      },
    ],
  ])(
    'requires an explicit disease and preserves source notes for multi-disease %s',
    (id, first, second) => {
      renderPanel({ id, diseases: [first, second] })

      const rangeSelect = screen.getByLabelText('Catalog ranges for short-read plots')
      expect((rangeSelect as HTMLSelectElement).value).toBe('')
      expect(screen.queryByText(/Catalog context for/)).toBeNull()
      expect(screen.getByTestId('short-allele-plot').getAttribute('data-ranges')).toBe('[]')

      fireEvent.change(rangeSelect, { target: { value: first.name } })
      expect(screen.getByText(new RegExp(`Catalog context for ${first.name}`))).not.toBeNull()
      if (first.notes) expect(screen.getByText(first.notes)).not.toBeNull()
      expect(screen.getByRole('button', { name: 'Hide ranges' })).not.toBeNull()
      const displayedRanges = JSON.parse(
        screen.getByTestId('short-allele-plot').getAttribute('data-ranges')!
      )
      expect(displayedRanges).toHaveLength(first.repeat_size_classifications.length)
      expect(displayedRanges.map((range: any) => range.label)).toEqual(
        first.repeat_size_classifications.map((range) => range.classification)
      )

      fireEvent.click(screen.getByRole('button', { name: 'Hide ranges' }))
      expect((rangeSelect as HTMLSelectElement).value).toBe('')
      expect(screen.getByTestId('short-allele-plot').getAttribute('data-ranges')).toBe('[]')
    }
  )

  test('does not draw a completed band when the catalog supplies no limits', () => {
    renderPanel({
      diseases: [
        {
          name: 'Incomplete catalog example',
          symbol: 'ICE',
          repeat_size_classifications: [{ classification: 'Unspecified', min: null, max: null }],
          notes: 'No limits supplied.',
        },
      ],
    })

    expect(screen.getByText('Unspecified: source limits not provided')).not.toBeNull()
    expect(screen.getByTestId('short-allele-plot').getAttribute('data-ranges')).toBe('[]')
    expect(screen.getByTestId('short-genotype-plot').getAttribute('data-ranges')).toBe('[[],[]]')
  })

  test('renders allele and genotype unavailable states independently', () => {
    renderPanel({
      allele: { status: 'UNAVAILABLE', reason_code: 'ALLELE_EMPTY', distributions: [] },
    })

    expect(screen.getByRole('heading', { name: 'Allele-copy distribution' })).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: /genotype repeat-count distribution/ })
    ).not.toBeNull()
    expect(screen.queryByTestId('short-allele-plot')).toBeNull()
    expect(screen.getByTestId('short-genotype-plot')).not.toBeNull()
    expect(
      screen
        .getByRole('heading', { name: 'Allele-copy distribution' })
        .closest('section')
        ?.getAttribute('data-reason-code')
    ).toBe('ALLELE_EMPTY')
  })

  test('uses a keyboard-accessible responsive one-column layout', () => {
    renderPanel()
    const grid = screen.getByTestId('short-read-distribution-grid')
    expect(grid).toHaveStyleRule('grid-template-columns', 'repeat(2,minmax(280px,1fr))')
    expect(grid).toHaveStyleRule('grid-template-columns', 'minmax(0,1fr)', {
      media: '(max-width:800px)',
    })

    const rangeSelect = screen.getByLabelText('Catalog ranges for short-read plots')
    rangeSelect.focus()
    expect(document.activeElement).toBe(rangeSelect)
    expect(screen.getByRole('button', { name: 'Hide ranges' })).not.toBeNull()
  })
})
