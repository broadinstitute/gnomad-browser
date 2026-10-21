import { readFile } from 'fs/promises'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { sequencingFactory, variantFactory } from '../../browser/src/__factories__/Variant'

const QUERY_TIMEOUT_MS = 30_000

type SequencingSummary = { filters: string[] }
type LiveVariantSummary = {
  variant_id: string
  exome: SequencingSummary | null
  genome: SequencingSummary | null
}
type LiveClinvarSummary = { variant_id: string; gold_stars: number }
type GeneVariantsResponse = {
  data: {
    gene: {
      variants: LiveVariantSummary[]
      clinvar_variants: LiveClinvarSummary[]
    }
  }
}

const loadPcsk9Variants = async (page: Page): Promise<GeneVariantsResponse['data']['gene']> => {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.request().postDataJSON()?.operationName === 'VariantsInGene',
    { timeout: QUERY_TIMEOUT_MS }
  )
  await page.goto('/')
  await page.getByRole('link', { name: 'PCSK9' }).click()
  const response = await responsePromise
  expect(response.ok()).toBe(true)
  const body: GeneVariantsResponse = await response.json()
  expect(body.data.gene.variants.length).toBeGreaterThan(0)
  expect(body.data.gene.clinvar_variants.length).toBeGreaterThan(0)
  await expect(page.getByRole('grid')).toBeVisible({ timeout: QUERY_TIMEOUT_MS })
  return body.data.gene
}

const passExomeVariantIds = (variants: LiveVariantSummary[]): string[] => {
  return variants
    .filter((variant) => {
      const [, , ref, alt] = variant.variant_id.split('-')
      const supportedType = (ref.length === 1 && alt.length === 1) || ref.length !== alt.length
      return variant.exome && variant.exome.filters.length === 0 && supportedType
    })
    .map((variant) => variant.variant_id)
}

test('recovers a scrolled table through empty results using existing filters', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const variants = Array.from({ length: 30 }, (_, index) => {
    const pos = 100 + index * 10
    return {
      ...variantFactory.build({
        reference_genome: 'GRCh37',
        variant_id: `1-${pos}-A-C`,
        pos,
        rsids: [],
      }),
      consequence: index === 0 ? 'synonymous_variant' : 'missense_variant',
      exome: sequencingFactory.build({ ac: 2, an: 100, filters: [] }),
      genome: null,
      flags: [],
      hgvs: '',
      hgvsc: '',
      hgvsp: '',
      transcript_id: '',
      transcript_version: '',
      clinical_significance: '',
      clinvar_variation_id: '',
    }
  })
  await page.route('**/api/**', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback()
      return
    }
    const { operationName } = route.request().postDataJSON()
    if (operationName === 'Region') {
      await route.fulfill({
        json: {
          data: { region: { genes: [], non_coding_constraints: [], short_tandem_repeats: [] } },
        },
      })
    } else if (operationName === 'VariantInRegion') {
      await route.fulfill({
        json: {
          data: {
            meta: { clinvar_release_date: '2026-10-01' },
            region: { variants, clinvar_variants: [] },
          },
        },
      })
    } else if (operationName === 'RegionCoverage') {
      await route.fulfill({ json: { data: { region: { coverage: { exome: [], genome: [] } } } } })
    } else {
      await route.fallback()
    }
  })
  await page.goto('/region/1-1-10000?dataset=gnomad_r2_1')
  const grid = page.getByRole('grid')
  await expect(grid).toHaveAttribute('aria-rowcount', '31')
  await grid.evaluate((element) => {
    const viewport = Array.from(element.querySelectorAll('div')).find(
      (child) =>
        child.scrollHeight > child.clientHeight && getComputedStyle(child).overflowY === 'auto'
    )
    if (!viewport) throw new Error('Missing scrollable variant table viewport')
    viewport.scrollTop = viewport.scrollHeight
  })
  await expect(grid.getByRole('rowheader', { name: '1-390-A-C', exact: true })).toBeVisible()
  const selectOnly = async (label: string) => {
    await page
      .getByRole('checkbox', { name: label, exact: true })
      .locator('..')
      .locator('..')
      .getByRole('button', { name: 'only', exact: true })
      .click()
  }
  await selectOnly('Synonymous')
  await expect(grid.getByRole('rowheader')).toHaveText(['1-100-A-C'])
  await selectOnly('Other')
  await expect(grid).toHaveCount(0)
  await expect(page.getByText('No matching variants', { exact: true })).toBeVisible()
  await page.getByPlaceholder('Search variant table').fill('1-100-A-C')
  expect(errors).toEqual([])
  await selectOnly('Synonymous')
  await expect(grid.getByRole('rowheader')).toHaveText(['1-100-A-C'])
  await page.getByPlaceholder('Search variant table').clear()
  await page
    .getByRole('checkbox', { name: 'Missense / Inframe indel', exact: true })
    .locator('..')
    .click()
  await expect(grid).toHaveAttribute('aria-rowcount', '31')
  await expect(grid.getByRole('rowheader', { name: '1-100-A-C', exact: true })).toBeVisible()
  await selectOnly('Other')
  await page.getByPlaceholder('Search variant table').fill('1-390-A-C')
  await selectOnly('Missense / Inframe indel')
  await expect(grid.getByRole('rowheader', { name: '1-390-A-C', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test.describe('Variant filters with real API data', () => {
  let uncaughtErrors: string[]

  test.beforeEach(async ({ page }) => {
    uncaughtErrors = []
    page.on('pageerror', (error) => uncaughtErrors.push(error.message))
  })

  test.afterEach(() => {
    expect(uncaughtErrors).toEqual([])
  })

  test('filters live ClinVar variants by minimum review stars', async ({ page }) => {
    const { clinvar_variants: variants } = await loadPcsk9Variants(page)
    await page.locator('#clinvar-star-filter').selectOption('4')
    const expectedCount = variants.filter((variant) => variant.gold_stars >= 4).length
    await expect(
      page.getByText(`ClinVar variants (${expectedCount})`, { exact: true })
    ).toBeVisible()
  })

  test('preserves live ClinVar membership when switching plot modes', async ({ page }) => {
    const { clinvar_variants: variants } = await loadPcsk9Variants(page)
    await page.getByRole('button', { name: 'Expand to all variants' }).click()
    await expect(page.getByRole('button', { name: 'Collapse to bins' })).toBeVisible()
    await expect(
      page.getByText(`ClinVar variants (${variants.length})`, { exact: true })
    ).toBeVisible()
    await page.getByRole('button', { name: 'Collapse to bins' }).click()
    await expect(page.getByRole('button', { name: 'Expand to all variants' })).toBeVisible()
    await expect(
      page.getByText(`ClinVar variants (${variants.length})`, { exact: true })
    ).toBeVisible()
  })

  test('restricts the live gnomAD table to PASS exome variants', async ({ page }) => {
    const { variants } = await loadPcsk9Variants(page)
    const expectedIds = passExomeVariantIds(variants)
    expect(expectedIds.length).toBeGreaterThan(0)
    await page.getByRole('checkbox', { name: 'Genomes', exact: true }).uncheck()
    const grid = page.getByRole('grid')
    await expect(grid).toHaveAttribute('aria-rowcount', String(expectedIds.length + 1))
    const visibleIds = await grid.getByRole('rowheader').allTextContents()
    expect(visibleIds.length).toBeGreaterThan(0)
    expect(expectedIds).toEqual(expect.arrayContaining(visibleIds))
  })

  test('downloads exactly the live gnomAD variants passing the source filter', async ({ page }) => {
    const { variants } = await loadPcsk9Variants(page)
    const expectedIds = passExomeVariantIds(variants)
    await page.getByRole('checkbox', { name: 'Genomes', exact: true }).uncheck()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export variants to CSV' }).click()
    const download = await downloadPromise
    const path = await download.path()
    if (!path) {
      throw new Error('The browser did not save the variant CSV download')
    }
    const csv = await readFile(path, 'utf8')
    const [header, ...rows] = csv.trim().split(/\r?\n/)
    expect(header.split(',')[0]).toBe('gnomAD ID')
    expect(rows.map((row) => row.split(',')[0]).sort()).toEqual([...expectedIds].sort())
  })
})
