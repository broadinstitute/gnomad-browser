import '@testing-library/jest-dom'
import React from 'react'
import { afterEach, beforeEach, describe, jest, test } from '@jest/globals'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { RegionViewerContext, regionViewerScale } from '@gnomad/region-viewer'
import { DatasetId, labelForDataset, referenceGenome } from '@gnomad/dataset-metadata/metadata'

import stubVariantTrackCanvas from '../../../tests/__helpers__/stubVariantTrackCanvas'
import geneFactory from '../__factories__/Gene'
import { sequencingFactory, variantFactory } from '../__factories__/Variant'
import userPreferences from '../userPreferences'
import Variants from './Variants'
import useVariantFiltering from './useVariantFiltering'

jest.setTimeout(15_000)

type User = ReturnType<typeof userEvent.setup>

const DEFAULT_TEST_DATASET_ID: DatasetId = 'gnomad_r2_1'

const buildTestGnomadVariants = (datasetId: DatasetId = DEFAULT_TEST_DATASET_ID) => {
  const testExomeData = sequencingFactory.build({ ac: 2, an: 100, filters: [] })
  const testGenomeData = sequencingFactory.build({ ac: 6, an: 200, filters: [] })
  const testFilteredExomeData = sequencingFactory.build({ ac: 10, an: 100, filters: ['RF'] })
  const testGnomadVariantDefinitions = [
    {
      variant_id: '1-100-A-C',
      pos: 100,
      consequence: 'missense_variant',
      exome: testExomeData,
      genome: null,
      hgvs: 'exome-match',
    },
    {
      variant_id: '1-100-A-G',
      pos: 100,
      consequence: 'synonymous_variant',
      exome: null,
      genome: testGenomeData,
      hgvs: 'genome-match',
    },
    {
      variant_id: '1-200-A-AT',
      pos: 200,
      consequence: 'frameshift_variant',
      exome: testExomeData,
      genome: testGenomeData,
      hgvs: 'both-match',
    },
    {
      variant_id: '1-300-AT-A',
      pos: 300,
      consequence: 'intron_variant',
      exome: testFilteredExomeData,
      genome: null,
      hgvs: 'filtered-match',
    },
    {
      variant_id: '1-400-G-T',
      pos: 400,
      consequence: 'missense_variant',
      exome: testFilteredExomeData,
      genome: testGenomeData,
      hgvs: 'mixed-match',
    },
  ]
  return testGnomadVariantDefinitions.map((testGnomadVariantDefinition) => ({
    ...variantFactory.build({
      reference_genome: referenceGenome(datasetId),
      variant_id: testGnomadVariantDefinition.variant_id,
      pos: testGnomadVariantDefinition.pos,
      rsids: [],
    }),
    ...testGnomadVariantDefinition,
    flags: [],
    hgvsc: '',
    hgvsp: '',
    transcript_id: '',
    transcript_version: '',
    clinical_significance: '',
    clinvar_variation_id: '',
  }))
}

const buildTestGnomadVariantWithJointData = () => {
  const testGnomadVariant = buildTestGnomadVariants('gnomad_r4')[2]
  return {
    ...testGnomadVariant,
    joint: {
      ...sequencingFactory.build({ ac: 5, an: 250, filters: [] }),
      freq_comparison_stats: {
        contingency_table_test: [],
        cochran_mantel_haenszel_test: { chisq: 0, p_value: 1 },
        stat_union: { p_value: 1, stat_test_name: '', gen_ancs: [] },
      },
    },
  }
}

type VariantFilteringHarnessProps = Parameters<typeof useVariantFiltering>[0] & {
  exportFileName: string
}

const VariantFilteringHarness = ({
  datasetId,
  clinvarReleaseDate,
  context,
  variants,
  exportFileName,
}: VariantFilteringHarnessProps) => {
  const selection = useVariantFiltering({ datasetId, clinvarReleaseDate, context, variants })
  return (
    <Variants
      datasetId={datasetId}
      context={context}
      exportFileName={exportFileName}
      selection={selection}
    />
  )
}

const renderGnomadVariantFilters = (
  datasetId: DatasetId = DEFAULT_TEST_DATASET_ID,
  testGnomadVariants = buildTestGnomadVariants(datasetId)
) => {
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
        <VariantFilteringHarness
          datasetId={datasetId}
          clinvarReleaseDate="2026-10-01"
          context={geneFactory.build({ chrom: '1', reference_genome: referenceGenome(datasetId) })}
          variants={testGnomadVariants}
          exportFileName="filter-test"
        />
      </RegionViewerContext.Provider>
    </BrowserRouter>
  )
}

const getDisplayedGnomadVariantIds = () => {
  const grid = screen.queryByRole('grid')
  if (!grid) {
    return []
  }
  return within(grid)
    .getAllByRole('rowheader')
    .map((cell) => cell.textContent)
}

const expectDisplayedGnomadVariantIds = (
  expectedVariantIds: string[],
  datasetId: DatasetId = DEFAULT_TEST_DATASET_ID
) => {
  expect(getDisplayedGnomadVariantIds()).toEqual(expectedVariantIds)
  expect(
    screen.getByText(`${labelForDataset(datasetId)} variants (${expectedVariantIds.length})`)
  ).toBeVisible()
}

const getGnomadAlleleMetricCell = (variantId: string, heading: string) => {
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
  test.each<DatasetId>(['gnomad_r2_1', 'gnomad_r4'])(
    'hides variants with no PASS source by default in %s',
    (datasetId) => {
      renderGnomadVariantFilters(datasetId)
      expectDisplayedGnomadVariantIds(
        ['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-400-G-T'],
        datasetId
      )
    }
  )

  test.each<DatasetId>(['gnomad_r2_1', 'gnomad_r4'])(
    'includes filtered variants when the QC filter is enabled in %s',
    async (datasetId) => {
      const user = userEvent.setup()
      renderGnomadVariantFilters(datasetId)
      await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
      expectDisplayedGnomadVariantIds(
        ['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-300-AT-A', '1-400-G-T'],
        datasetId
      )
    }
  )

  test.each<[string, string[]]>([
    ['Genomes', ['1-100-A-C', '1-200-A-AT']],
    ['Exomes', ['1-100-A-G', '1-200-A-AT', '1-400-G-T']],
  ])(
    'excludes variants without a remaining PASS source after disabling %s',
    async (source, expected) => {
      const user = userEvent.setup()
      renderGnomadVariantFilters()
      await user.click(screen.getByRole('checkbox', { name: source }))
      expectDisplayedGnomadVariantIds(expected)
    }
  )

  test.each<[string, string, string, string]>([
    ['Genomes', '2', '100', '2.00e-2'],
    ['Exomes', '6', '200', '3.00e-2'],
  ])('uses only the remaining source metrics after disabling %s', async (source, ac, an, af) => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: source }))
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe(ac)
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe(an)
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe(af)
  })

  test('combines exome and genome allele metrics when both sources are selected in v2', () => {
    renderGnomadVariantFilters()
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe('8')
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe('300')
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe('2.67e-2')
  })

  test('uses joint allele metrics when both sources are selected in v4', () => {
    renderGnomadVariantFilters('gnomad_r4', [buildTestGnomadVariantWithJointData()])
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe('5')
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe('250')
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Frequency').textContent).toBe('2.00e-2')
  })

  test.each<[string, string, string]>([
    ['Genomes', '2', '100'],
    ['Exomes', '6', '200'],
  ])('stops using joint allele metrics after disabling %s in v4', async (source, ac, an) => {
    const user = userEvent.setup()
    renderGnomadVariantFilters('gnomad_r4', [buildTestGnomadVariantWithJointData()])
    await user.click(screen.getByRole('checkbox', { name: source }))
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Count').textContent).toBe(ac)
    expect(getGnomadAlleleMetricCell('1-200-A-AT', 'Allele Number').textContent).toBe(an)
  })

  test('excludes a failed source from allele metrics when the other source passes', () => {
    renderGnomadVariantFilters()
    expect(getGnomadAlleleMetricCell('1-400-G-T', 'Allele Count')).toHaveTextContent('6')
    expect(getGnomadAlleleMetricCell('1-400-G-T', 'Allele Number')).toHaveTextContent('200')
  })

  test('includes failed-source allele metrics when the QC filter is enabled', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expect(getGnomadAlleleMetricCell('1-400-G-T', 'Allele Count').textContent).toBe('16')
    expect(getGnomadAlleleMetricCell('1-400-G-T', 'Allele Number').textContent).toBe('300')
  })

  test.each<[string, string[]]>([
    ['pLoF', ['1-200-A-AT']],
    ['Missense / Inframe indel', ['1-100-A-C', '1-400-G-T']],
    ['Synonymous', ['1-100-A-G']],
    ['Other', []],
  ])('shows only the selected consequence category: %s', async (label, expected) => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await selectOnlyConsequence(user, label)
    expectDisplayedGnomadVariantIds(expected)
  })

  test.each<[string, string[]]>([
    ['SNVs', ['1-200-A-AT']],
    ['Indels', ['1-100-A-C', '1-100-A-G', '1-400-G-T']],
  ])('excludes the disabled variant type: %s', async (label, expected) => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: label }))
    expectDisplayedGnomadVariantIds(expected)
  })

  test('keeps neighboring variants visible when searching with context enabled', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectDisplayedGnomadVariantIds(['1-100-A-C', '1-100-A-G', '1-200-A-AT', '1-400-G-T'])
  })

  test('removes nonmatching variants when searching with context disabled', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectDisplayedGnomadVariantIds(['1-100-A-C'])
  })

  test('stops searching a column removed through table configuration', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectDisplayedGnomadVariantIds(['1-100-A-C'])
    await user.click(screen.getByRole('button', { name: 'Configure table' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /^HGVS Consequence/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expectDisplayedGnomadVariantIds([])
    expect(screen.getByText('No matching variants')).toBeVisible()
  })

  test('requires variants to pass every active gnomAD filter', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await selectOnlyConsequence(user, 'Missense / Inframe indel')
    await user.click(screen.getByRole('checkbox', { name: 'Genomes' }))
    await user.click(screen.getByRole('checkbox', { name: 'Display neighboring variants' }))
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expectDisplayedGnomadVariantIds(['1-100-A-C'])
  })

  test('restores gnomAD variants when an excluding filter is relaxed', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await selectOnlyConsequence(user, 'Other')
    expectDisplayedGnomadVariantIds([])
    expect(screen.getByText('No matching variants')).toBeVisible()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expectDisplayedGnomadVariantIds(['1-300-AT-A'])
  })

  test('allows searching while consequence filters exclude every variant', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await selectOnlyConsequence(user, 'Other')
    await user.type(screen.getByPlaceholderText('Search variant table'), 'exome-match')
    expect(screen.getByText('No matching variants')).toBeVisible()
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expectDisplayedGnomadVariantIds(['1-300-AT-A'])
  })

  test('navigates to a search entered while the table was empty when rows return', async () => {
    const user = userEvent.setup()
    const template = buildTestGnomadVariants()[0]
    const variants = Array.from({ length: 40 }, (_, index) => ({
      ...template,
      pos: 1000 + index * 10,
      variant_id: `1-${1000 + index * 10}-A-C`,
    }))
    renderGnomadVariantFilters(DEFAULT_TEST_DATASET_ID, variants)
    const targetId = '1-1390-A-C'
    expect(screen.queryByRole('rowheader', { name: targetId })).toBeNull()
    await selectOnlyConsequence(user, 'Other')
    await user.type(screen.getByPlaceholderText('Search variant table'), targetId)
    await selectOnlyConsequence(user, 'Missense / Inframe indel')
    expect(await screen.findByRole('rowheader', { name: targetId })).toBeVisible()
  })

  test('preserves the table instance when filtered results become empty', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    const table = screen.getByRole('grid')
    await selectOnlyConsequence(user, 'Other')
    expect(table).toBeInTheDocument()
    expect(table).not.toBeVisible()
    expect(within(table).queryAllByRole('rowheader')).toEqual([])
    await user.click(screen.getByRole('checkbox', { name: 'Filtered variants' }))
    expect(screen.getByRole('grid')).toBe(table)
    expectDisplayedGnomadVariantIds(['1-300-AT-A'])
  })

  test('preserves filtered membership when the table sort changes', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await selectOnlyConsequence(user, 'Missense / Inframe indel')
    await user.click(screen.getByRole('button', { name: 'Variant ID' }))
    expectDisplayedGnomadVariantIds(['1-400-G-T', '1-100-A-C'])
  })

  test('exports exactly the variants passing the current filters', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
    await user.click(screen.getByRole('checkbox', { name: 'Genomes' }))
    await user.click(screen.getByRole('checkbox', { name: 'Indels' }))
    const { rows } = await exportSingleSourceRows(user)
    expect(rows.map((row) => row[0])).toEqual(['1-100-A-C'])
  })

  test('exports allele metrics from the selected sequencing source', async () => {
    const user = userEvent.setup()
    renderGnomadVariantFilters()
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
