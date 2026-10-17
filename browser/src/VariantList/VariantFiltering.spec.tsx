import React from 'react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { DatasetId } from '@gnomad/dataset-metadata/metadata'

import stubVariantTrackCanvas from '../../../tests/__helpers__/stubVariantTrackCanvas'
import geneFactory from '../__factories__/Gene'
import { v2SequencingFactory, v2VariantFactory } from '../__factories__/Variant'
import userPreferences from '../userPreferences'
import Variants from './Variants'

type User = ReturnType<typeof userEvent.setup>

const buildVariants = () => {
  const exome = v2SequencingFactory.build({ ac: 2, an: 100, filters: [] })
  const genome = v2SequencingFactory.build({ ac: 6, an: 200, filters: [] })
  const filteredExome = v2SequencingFactory.build({ ac: 10, an: 100, filters: ['RF'] })
  return [
    {
      variant_id: '1-100-A-C',
      pos: 100,
      consequence: 'missense_variant',
      exome,
      genome: null,
      hgvs: 'exome-match',
    },
    {
      variant_id: '1-100-A-G',
      pos: 100,
      consequence: 'synonymous_variant',
      exome: null,
      genome,
      hgvs: 'genome-match',
    },
    {
      variant_id: '1-200-A-AT',
      pos: 200,
      consequence: 'frameshift_variant',
      exome,
      genome,
      hgvs: 'both-match',
    },
    {
      variant_id: '1-300-AT-A',
      pos: 300,
      consequence: 'intron_variant',
      exome: filteredExome,
      genome: null,
      hgvs: 'filtered-match',
    },
    {
      variant_id: '1-400-G-T',
      pos: 400,
      consequence: 'missense_variant',
      exome: filteredExome,
      genome,
      hgvs: 'mixed-match',
    },
  ].map((record) => ({
    ...v2VariantFactory.build({ variant_id: record.variant_id, pos: record.pos, rsids: [] }),
    ...record,
    flags: [],
    hgvsc: '',
    hgvsp: '',
    transcript_id: '',
    transcript_version: '',
    clinical_significance: '',
    clinvar_variation_id: '',
  }))
}

const buildJointVariant = () => {
  const variant = buildVariants()[2]
  return {
    ...variant,
    joint: {
      ...v2SequencingFactory.build({ ac: 5, an: 250, filters: [] }),
      freq_comparison_stats: {
        contingency_table_test: [],
        cochran_mantel_haenszel_test: { chisq: 0, p_value: 1 },
        stat_union: { p_value: 1, stat_test_name: '', gen_ancs: [] },
      },
    },
  }
}

const renderVariantFilters = (datasetId: DatasetId = 'gnomad_r2_1', variants = buildVariants()) => {
  const regions = [{ start: 1, stop: 500 }]
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
        <Variants
          datasetId={datasetId}
          clinvarReleaseDate="2026-10-01"
          context={geneFactory.build({ chrom: '1' })}
          variants={variants}
          exportFileName="filter-test"
        />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )
}

const displayedVariantIds = () => {
  const grid = screen.queryByRole('grid')
  if (!grid) {
    return []
  }
  return within(grid)
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)
}

const expectVariantIds = (expected: string[]) => {
  expect(displayedVariantIds()).toEqual(expected)
  expect(screen.getByText(`gnomAD v2.1.1 variants (${expected.length})`)).toBeVisible()
}

const alleleMetricCell = (variantId: string, heading: string) => {
  const grid = screen.getByRole('grid')
  const columnIndex = within(grid)
    .getAllByRole('columnheader')
    .findIndex((column) => column.textContent === heading)
  expect(columnIndex).toBeGreaterThan(-1)
  const row = within(grid).getByText(variantId).closest('[role="row"]')
  if (!row) {
    throw new Error(`Missing variant row: ${variantId}`)
  }
  const cell = row.querySelector(`[aria-colindex="${columnIndex + 1}"]`)
  if (!cell) {
    throw new Error(`Missing ${heading} cell for ${variantId}`)
  }
  return cell
}

const selectOnlyConsequence = async (user: User, label: string) => {
  const category = screen.getByRole('checkbox', { name: label }).closest('label')?.parentElement
  if (!category) {
    throw new Error(`Missing consequence control: ${label}`)
  }
  await user.click(within(category).getByRole('button', { name: 'only' }))
}

const readBlob = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

const exportSingleSourceRows = async (user: User) => {
  let exportedBlob: Blob | undefined
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob) => {
      exportedBlob = blob
      return 'blob:variant-export'
    },
  })
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  await user.click(screen.getByRole('button', { name: 'Export variants to CSV' }))
  if (!exportedBlob) {
    throw new Error('The export button did not create a CSV blob')
  }
  const csv = await readBlob(exportedBlob)
  const [header, ...lines] = csv.trim().split('\r\n')
  return { header: header.split(','), rows: lines.map((line) => line.split(',')) }
}

beforeEach(async () => {
  localStorage.clear()
  await userPreferences.loadPreferences()
  stubVariantTrackCanvas()
})

afterEach(() => {
  jest.restoreAllMocks()
  Reflect.deleteProperty(URL, 'createObjectURL')
  document.querySelectorAll('a[download]').forEach((link) => link.remove())
})

describe('gnomAD variant filtering', () => {
  test('hides variants with no PASS source by default', () => {
    renderVariantFilters()
    expectVariantIds(['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-400-G-T'])
  })

  test('includes filtered variants when the QC filter is enabled', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expectVariantIds(['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-300-AT-A', '1-400-G-T'])
  })

  test.each<[string, string[]]>([
    ['Genomes', ['1-100-A-C', '1-200-A-AT']],
    ['Exomes', ['1-100-A-G', '1-200-A-AT', '1-400-G-T']],
  ])(
    'excludes variants without a remaining PASS source after disabling %s',
    async (source, expected) => {
      const user = userEvent.setup()
      renderVariantFilters()
      await user.click(screen.getByRole('checkbox', { name: source }))
      expectVariantIds(expected)
    }
  )

  test.each<[string, string, string, string]>([
    ['Genomes', '2', '100', '2.00e-2'],
    ['Exomes', '6', '200', '3.00e-2'],
  ])('uses only the remaining source metrics after disabling %s', async (source, ac, an, af) => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: source }))
    expect(alleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe(ac)
    expect(alleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe(an)
    expect(alleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe(af)
  })

  test('combines exome and genome allele metrics when both sources are selected in v2', () => {
    renderVariantFilters()
    expect(alleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe('8')
    expect(alleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe('300')
    expect(alleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe('2.67e-2')
  })

  test('uses joint allele metrics when both sources are selected in v4', () => {
    renderVariantFilters('gnomad_r4', [buildJointVariant()])
    expect(alleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe('5')
    expect(alleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe('250')
    expect(alleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe('2.00e-2')
  })

  test.each<[string, string, string]>([
    ['Genomes', '2', '100'],
    ['Exomes', '6', '200'],
  ])('stops using joint allele metrics after disabling %s in v4', async (source, ac, an) => {
    const user = userEvent.setup()
    renderVariantFilters('gnomad_r4', [buildJointVariant()])
    await user.click(screen.getByRole('checkbox', { name: source }))
    expect(alleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe(ac)
    expect(alleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe(an)
  })

  test('excludes a failed source from allele metrics when the other source passes', () => {
    renderVariantFilters()
    expect(alleleMetricCell('1-400-G-T', 'Allele Count')).toHaveTextContent('6')
    expect(alleleMetricCell('1-400-G-T', 'Allele Number')).toHaveTextContent('200')
  })

  test('includes failed-source allele metrics when the QC filter is enabled', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expect(alleleMetricCell('1-400-G-T', 'Allele Count').textContent).toBe('16')
    expect(alleleMetricCell('1-400-G-T', 'Allele Number').textContent).toBe('300')
  })

  test.each<[string, string[]]>([
    ['pLoF', ['1-200-A-AT']],
    ['Missense / Inframe indel', ['1-100-A-C', '1-400-G-T']],
    ['Synonymous', ['1-100-A-G']],
    ['Other', []],
  ])('shows only the selected consequence category: %s', async (label, expected) => {
    const user = userEvent.setup()
    renderVariantFilters()
    await selectOnlyConsequence(user, label)
    expectVariantIds(expected)
  })

  test.each<[string, string[]]>([
    ['SNVs', ['1-200-A-AT']],
    ['Indels', ['1-100-A-C', '1-100-A-G', '1-400-G-T']],
  ])('excludes the disabled variant type: %s', async (label, expected) => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: label }))
    expectVariantIds(expected)
  })

  test('keeps neighboring variants visible when searching with context enabled', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectVariantIds(['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-400-G-T'])
  })

  test('removes nonmatching variants when searching with context disabled', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectVariantIds(['1-100-A-C'])
  })

  test('stops searching a column removed through table configuration', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectVariantIds(['1-100-A-C'])
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /^HGVS Consequence/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expectVariantIds([])
    expect(screen.getByText('No matching variants')).toBeVisible()
  })

  test('requires variants to pass every active gnomAD filter', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await selectOnlyConsequence(user, 'Missense / Inframe indel')
    await user.click(screen.getByRole('checkbox', { name: 'Genomes' }))
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectVariantIds(['1-100-A-C'])
  })

  test('restores gnomAD variants when an excluding filter is relaxed', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await selectOnlyConsequence(user, 'Other')
    expectVariantIds([])
    expect(screen.getByText('No matching variants')).toBeVisible()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expectVariantIds(['1-300-AT-A'])
  })

  test('preserves filtered membership when the table sort changes', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await selectOnlyConsequence(user, 'Missense / Inframe indel')
    await user.click(screen.getByRole('button', { name: 'Variant ID' }))
    expectVariantIds(['1-400-G-T', '1-100-A-C'])
  })

  test('exports exactly the variants passing the current filters', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Genomes' }))
    await user.click(screen.getByRole('checkbox', { name: 'Indels' }))
    const { rows } = await exportSingleSourceRows(user)
    expect(rows.map((row) => row[0])).toEqual(['1-100-A-C'])
  })

  test('exports allele metrics from the selected sequencing source', async () => {
    const user = userEvent.setup()
    renderVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Genomes' }))
    await user.click(screen.getByRole('checkbox', { name: 'SNVs' }))
    const { header, rows } = await exportSingleSourceRows(user)
    expect(rows).toHaveLength(1)
    expect(rows[0][0]).toBe('1-200-A-AT')
    expect(rows[0][header.indexOf('Source')]).toBe('gnomAD Exomes')
    expect(rows[0][header.indexOf('Allele Count')]).toBe('2')
    expect(rows[0][header.indexOf('Allele Number')]).toBe('100')
    expect(rows[0][header.indexOf('Allele Frequency')]).toBe('0.02')
  })
})
