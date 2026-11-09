import '@testing-library/jest-dom'
import React from 'react'
import { describe, jest, test } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'

import clinvarVariantFactory from '../__factories__/ClinvarVariant'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import { ClinvarVariantTrack } from './ClinvarVariantTrack'

jest.setTimeout(15_000)

type User = ReturnType<typeof userEvent.setup>

type TestClinvarVariantDefinition = Pick<
  ClinvarVariant,
  'pos' | 'clinical_significance' | 'major_consequence' | 'gold_stars' | 'in_gnomad'
>

const testClinvarVariantDefinitions: TestClinvarVariantDefinition[] = [
  {
    pos: 100,
    clinical_significance: 'Pathogenic',
    major_consequence: 'stop_gained',
    gold_stars: 4,
    in_gnomad: true,
  },
  {
    pos: 200,
    clinical_significance: 'Likely pathogenic',
    major_consequence: 'missense_variant',
    gold_stars: 3,
    in_gnomad: true,
  },
  {
    pos: 300,
    clinical_significance: 'Uncertain significance',
    major_consequence: 'synonymous_variant',
    gold_stars: 2,
    in_gnomad: true,
  },
  {
    pos: 400,
    clinical_significance: 'Conflicting classifications of pathogenicity',
    major_consequence: 'intron_variant',
    gold_stars: 1,
    in_gnomad: false,
  },
  {
    pos: 500,
    clinical_significance: 'Benign',
    major_consequence: 'missense_variant',
    gold_stars: 3,
    in_gnomad: true,
  },
  {
    pos: 600,
    clinical_significance: 'drug response',
    major_consequence: 'intron_variant',
    gold_stars: 0,
    in_gnomad: true,
  },
  {
    pos: 700,
    clinical_significance: 'Pathogenic',
    major_consequence: 'stop_gained',
    gold_stars: 1,
    in_gnomad: true,
  },
  {
    pos: 800,
    clinical_significance: 'Pathogenic',
    major_consequence: 'missense_variant',
    gold_stars: 4,
    in_gnomad: false,
  },
]

const renderClinvarFilters = () => {
  const regions = [{ start: 1, stop: 900 }]
  const testClinvarVariants = testClinvarVariantDefinitions.map((testClinvarVariantDefinition) =>
    clinvarVariantFactory.build(
      { ...testClinvarVariantDefinition, variant_id: `1-${testClinvarVariantDefinition.pos}-A-C` },
      {
        associations: {
          gnomad: testClinvarVariantDefinition.in_gnomad
            ? { exome: { ac: 2, an: 100, filters: [] }, genome: null }
            : null,
        },
      }
    )
  )
  return render(
    <BrowserRouter>
      <RegionViewerContext.Provider
        value={{
          centerPanelWidth: 1200,
          leftPanelWidth: 200,
          rightPanelWidth: 0,
          regions,
          scalePosition: regionViewerScale(regions, [0, 1200]),
          isPositionDefined: () => true,
        }}
      >
        <ClinvarVariantTrack
          referenceGenome="GRCh38"
          transcripts={[]}
          variants={testClinvarVariants}
        />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )
}

const selectOnlyClinicalCategory = async (user: User, label: string) => {
  const [checkbox] = screen.getAllByRole('checkbox', { name: label })
  const category = checkbox.closest('label')?.parentElement
  if (!category) {
    throw new Error(`Missing clinical category control: ${label}`)
  }
  await user.click(within(category).getByRole('button', { name: 'only' }))
}

const expectExpandedVariantIds = (container: HTMLElement, expected: string[]) => {
  const ids = Array.from(container.querySelectorAll('[data-variant-id]')).map((marker) =>
    marker.getAttribute('data-variant-id')
  )
  expect(ids.sort()).toEqual([...expected].sort())
  expect(screen.getByText(`ClinVar variants (${expected.length})`)).toBeVisible()
}

const expandVariants = async (user: User) => {
  await user.click(screen.getByRole('button', { name: 'Expand to all variants' }))
}

describe('ClinVar variant filtering', () => {
  test('shows every ClinVar variant with the default filters', async () => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await expandVariants(user)
    expectExpandedVariantIds(container, [
      '1-100-A-C',
      '1-200-A-C',
      '1-300-A-C',
      '1-400-A-C',
      '1-500-A-C',
      '1-600-A-C',
      '1-700-A-C',
      '1-800-A-C',
    ])
  })

  test.each<[string, string[]]>([
    ['Pathogenic / likely pathogenic', ['1-100-A-C', '1-200-A-C', '1-700-A-C', '1-800-A-C']],
    ['Uncertain significance / conflicting', ['1-300-A-C', '1-400-A-C']],
    ['Benign / likely benign', ['1-500-A-C']],
    ['Other', ['1-600-A-C']],
  ])('shows only the selected clinical category: %s', async (label, expected) => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await selectOnlyClinicalCategory(user, label)
    await expandVariants(user)
    expectExpandedVariantIds(container, expected)
  })

  test.each<[string, string[]]>([
    ['pLoF', ['1-100-A-C', '1-700-A-C']],
    ['Missense / Inframe indel', ['1-200-A-C', '1-500-A-C', '1-800-A-C']],
    ['Synonymous', ['1-300-A-C']],
    ['Other', ['1-400-A-C', '1-600-A-C']],
  ])('shows only the selected consequence category: %s', async (label, expected) => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    const checkbox = screen.getAllByRole('checkbox', { name: label }).slice(-1)[0]
    const category = checkbox?.closest('label')?.parentElement
    if (!category) {
      throw new Error(`Missing consequence category control: ${label}`)
    }
    await user.click(within(category).getByRole('button', { name: 'only' }))
    await expandVariants(user)
    expectExpandedVariantIds(container, expected)
  })

  test.each<[string, string[]]>([
    [
      '1',
      ['1-100-A-C', '1-200-A-C', '1-300-A-C', '1-400-A-C', '1-500-A-C', '1-700-A-C', '1-800-A-C'],
    ],
    ['2', ['1-100-A-C', '1-200-A-C', '1-300-A-C', '1-500-A-C', '1-800-A-C']],
    ['3', ['1-100-A-C', '1-200-A-C', '1-500-A-C', '1-800-A-C']],
    ['4', ['1-100-A-C', '1-800-A-C']],
  ])('excludes variants below %s review stars', async (stars, expected) => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await user.selectOptions(screen.getByRole('combobox'), stars)
    await expandVariants(user)
    expectExpandedVariantIds(container, expected)
  })

  test('shows only variants marked in gnomAD when the membership filter is enabled', async () => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await user.click(
      screen.getByRole('checkbox', { name: 'Only show ClinVar variants that are in gnomAD' })
    )
    await expandVariants(user)
    expectExpandedVariantIds(container, [
      '1-100-A-C',
      '1-200-A-C',
      '1-300-A-C',
      '1-500-A-C',
      '1-600-A-C',
      '1-700-A-C',
    ])
  })

  test('requires variants to pass every active ClinVar filter', async () => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await selectOnlyClinicalCategory(user, 'Pathogenic / likely pathogenic')
    await user.click(
      screen.getByRole('checkbox', { name: 'Only show ClinVar variants that are in gnomAD' })
    )
    await user.selectOptions(screen.getByRole('combobox'), '3')
    await user.click(screen.getByRole('checkbox', { name: 'pLoF' }))
    await expandVariants(user)
    expectExpandedVariantIds(container, ['1-200-A-C'])
  })

  test('restores ClinVar variants when an excluding filter is relaxed', async () => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await selectOnlyClinicalCategory(user, 'Benign / likely benign')
    await user.selectOptions(screen.getByRole('combobox'), '4')
    expect(screen.getByText('ClinVar variants (0)')).toBeVisible()
    await user.selectOptions(screen.getByRole('combobox'), '3')
    await expandVariants(user)
    expectExpandedVariantIds(container, ['1-500-A-C'])
  })

  test('preserves filtered membership when switching between plot modes', async () => {
    const user = userEvent.setup()
    const { container } = renderClinvarFilters()
    await selectOnlyClinicalCategory(user, 'Uncertain significance / conflicting')
    expect(screen.getByText('ClinVar variants (2)')).toBeVisible()
    await expandVariants(user)
    expectExpandedVariantIds(container, ['1-300-A-C', '1-400-A-C'])
    await user.click(screen.getByRole('button', { name: 'Collapse to bins' }))
    expect(screen.getByText('ClinVar variants (2)')).toBeVisible()
    await expandVariants(user)
    expectExpandedVariantIds(container, ['1-300-A-C', '1-400-A-C'])
  })
})
