import { readFile } from 'fs/promises'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import buildLinkedVariantFixture from '../../browser/src/VariantList/__fixtures__/linkedVariants'

const REGION_PATH = '/region/1-1-10000?dataset=gnomad_r2_1'
const SHARED_IDS = ['1-100-A-C', '1-200-A-C', '1-300-A-AT', '1-700-A-C', '1-800-A-C']

type LiveVariantsResponse = {
  data: {
    gene: {
      variants: {
        variant_id: string
        exome: { filters: string[] } | null
        genome: { filters: string[] } | null
      }[]
      clinvar_variants: { variant_id: string }[]
    }
  }
}

const loadFixtureRegion = async (page: Page, extraRows = false) => {
  const fixture = buildLinkedVariantFixture()
  if (extraRows) {
    fixture.variants.push(
      ...Array.from({ length: 30 }, (_, index) => ({
        ...fixture.variants[0],
        pos: 1000 + index * 10,
        variant_id: `1-${1000 + index * 10}-A-C`,
      }))
    )
  }
  let variantRequests = 0
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') {
      await route.fallback()
      return
    }
    const { operationName, variables } = request.postDataJSON()
    if (variables.chrom !== '1' || variables.start !== 1 || variables.stop !== 10000) {
      await route.fallback()
      return
    }
    if (operationName === 'Region') {
      await route.fulfill({
        json: {
          data: { region: { genes: [], non_coding_constraints: [], short_tandem_repeats: [] } },
        },
      })
    } else if (operationName === 'VariantInRegion' && variables.datasetId === 'gnomad_r2_1') {
      variantRequests += 1
      await route.fulfill({
        json: {
          data: {
            meta: { clinvar_release_date: '2026-10-01' },
            region: { variants: fixture.variants, clinvar_variants: fixture.clinvarVariants },
          },
        },
      })
    } else if (operationName === 'RegionCoverage') {
      await route.fulfill({ json: { data: { region: { coverage: { exome: [], genome: [] } } } } })
    } else {
      await route.fallback()
    }
  })
  await page.goto(REGION_PATH)
  await expect(page.locator('#gnomad-variant-sync')).toBeVisible()
  await expect(page.getByRole('grid')).toBeVisible()
  return () => variantRequests
}

const expectSharedRows = async (page: Page, ids: string[]) => {
  await expect(page.getByRole('grid').getByRole('rowheader')).toHaveText(ids)
  await expect(page.getByText(`ClinVar variants (${ids.length})`, { exact: true })).toBeVisible()
  await expect(
    page.getByText(`gnomAD v2.1.1 variants (${ids.length})`, { exact: true })
  ).toBeVisible()
}

test('loads and exports shared PCSK9 variants from a configured live API', async ({ page }) => {
  test.skip(
    !process.env.GNOMAD_API_URL,
    'Set GNOMAD_API_URL to run live API compatibility coverage'
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.request().postDataJSON()?.operationName === 'VariantsInGene'
  )
  await page.goto('/gene/PCSK9?dataset=gnomad_r2_1')
  const response = await responsePromise
  expect(response.ok()).toBe(true)
  const body: LiveVariantsResponse = await response.json()
  const gnomadIds = body.data.gene.variants
    .filter((variant) => {
      const [, , ref, alt] = variant.variant_id.split('-')
      const isSupportedType = (ref.length === 1 && alt.length === 1) || ref.length !== alt.length
      const hasPassingSource =
        variant.exome?.filters.length === 0 || variant.genome?.filters.length === 0
      return isSupportedType && hasPassingSource
    })
    .map((variant) => variant.variant_id)
  const clinvarIds = new Set(body.data.gene.clinvar_variants.map((variant) => variant.variant_id))
  await page.locator('#clinvar-variant-sync').click()
  await expect(page.locator('#gnomad-variant-sync')).toBeChecked()
  await expect(page.getByRole('grid')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export variants to CSV' }).click()
  const path = await (await downloadPromise).path()
  if (!path) throw new Error('Missing live CSV download')
  const rows = (await readFile(path, 'utf8')).trim().split(/\r?\n/).slice(1)
  expect(rows.length).toBeGreaterThan(0)
  const expectedIds = gnomadIds.filter((id) => clinvarIds.has(id)).sort()
  expect(rows.map((row) => row.split(',')[0]).sort()).toEqual(expectedIds)
  expect(errors).toEqual([])
})

test.describe('linked filters with deterministic API responses', () => {
  let errors: string[]
  test.beforeEach(async ({ page }) => {
    errors = []
    page.on('pageerror', (error) => errors.push(error.message))
  })
  test.afterEach(() => expect(errors).toEqual([]))

  test('mirrors both toggles and filters without refetching variant data', async ({ page }) => {
    const requests = await loadFixtureRegion(page)
    const clinvarToggle = page.locator('#clinvar-variant-sync')
    const gnomadToggle = page.locator('#gnomad-variant-sync')
    await page
      .getByRole('group')
      .filter({ has: clinvarToggle })
      .getByRole('button', { name: 'More information', exact: true })
      .click()
    const helpDialog = page.getByRole('dialog')
    await expect(helpDialog).toBeVisible()
    await helpDialog.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(helpDialog).toHaveCount(0)
    await clinvarToggle.click()
    await expect(gnomadToggle).toBeChecked()
    await expectSharedRows(page, SHARED_IDS)
    await page.getByRole('button', { name: 'Expand to all variants' }).click()
    await expect(page.locator('[data-variant-id]')).toHaveCount(5)
    await page.locator('#clinvar-star-filter').selectOption('3')
    await page.getByRole('checkbox', { name: 'Exomes', exact: true }).uncheck()
    await expectSharedRows(page, ['1-700-A-C'])
    await gnomadToggle.click()
    await expect(clinvarToggle).not.toBeChecked()
    await expect(page.getByRole('grid').getByRole('rowheader')).toHaveText([
      '1-200-A-C',
      '1-700-A-C',
    ])
    await expect(page.getByText('ClinVar variants (6)', { exact: true })).toBeVisible()
    await expect(page.locator('#clinvar-star-filter')).toHaveValue('3')
    expect(requests()).toBe(1)
  })

  test('downloads the shared genome-only rows with their source-selected metrics', async ({
    page,
  }) => {
    const requests = await loadFixtureRegion(page)
    await page.locator('#gnomad-variant-sync').click()
    await page.getByRole('checkbox', { name: 'Exomes', exact: true }).uncheck()
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export variants to CSV' }).click()
    const download = await downloadPromise
    const path = await download.path()
    if (!path) throw new Error('Missing CSV download')
    const csv = await readFile(path, 'utf8')
    const [header, ...rows] = csv
      .trim()
      .split(/\r?\n/)
      .map((line) => line.split(','))
    expect(rows.map((row) => row[0])).toEqual(['1-200-A-C', '1-700-A-C'])
    expect(rows.map((row) => row[header.indexOf('Allele Count')])).toEqual(['6', '6'])
    expect(rows.map((row) => row[header.indexOf('Allele Number')])).toEqual(['200', '200'])
    expect(requests()).toBe(1)
  })

  test('recovers a scrolled virtualized table after shrinking to zero and restoring rows', async ({
    page,
  }) => {
    const requests = await loadFixtureRegion(page, true)
    const grid = page.getByRole('grid')
    await expect(grid).toHaveAttribute('aria-rowcount', '38')
    await grid.evaluate((element) => {
      const viewport = Array.from(element.querySelectorAll('div')).find(
        (child) =>
          child.clientHeight > 0 &&
          child.scrollHeight > child.clientHeight &&
          getComputedStyle(child).overflowY === 'auto'
      )
      if (!viewport) throw new Error('Missing scrollable variant table viewport')
      viewport.scrollTop = viewport.scrollHeight
    })
    await expect(grid.getByRole('rowheader', { name: '1-1290-A-C', exact: true })).toBeVisible()
    await page.locator('#clinvar-variant-sync').click()
    await expectSharedRows(page, SHARED_IDS)
    await page.locator('#clinvar-star-filter').selectOption('4')
    await page.getByRole('checkbox', { name: 'Exomes', exact: true }).uncheck()
    await expect(grid).toHaveCount(0)
    await expect(
      page.getByText('No variants match both sets of filters.', { exact: true })
    ).toHaveCount(2)
    await page.getByRole('checkbox', { name: 'Exomes', exact: true }).check()
    await expectSharedRows(page, ['1-100-A-C'])
    await page.locator('#gnomad-variant-sync').click()
    await expect(grid).toHaveAttribute('aria-rowcount', '38')
    await expect(grid.getByRole('rowheader', { name: '1-100-A-C', exact: true })).toBeVisible()
    expect(requests()).toBe(1)
  })
})
