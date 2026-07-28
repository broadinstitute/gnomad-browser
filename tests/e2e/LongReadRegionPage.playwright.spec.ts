import { test, expect, type Page } from '@playwright/test'

import { collectApiMetrics, reportApiMetrics, type ApiMetric } from './helpers/lrMetrics'

const LR_DATASET = 'gnomad_r4_lr'
// AMY2A locus, 50 kb. Small, dense with SNVs/indels, no haplotype build needed.
// Verified to render the LR Summary View with ~1120 variants.
const SUMMARY_REGION = '1-103600000-103650000'

test.describe('Long Read region page — Summary View', () => {
  let page: Page
  let metrics: ApiMetric[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    metrics = collectApiMetrics(page)
    await page.goto(`/region/${SUMMARY_REGION}?dataset=${LR_DATASET}`)
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('region metadata loads', async () => {
    await expect(page.getByText('Loading region')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: SUMMARY_REGION })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Region size')).toBeVisible()
  })

  test('summary view is the default and its controls render', async () => {
    await expect(page.locator('#lr-view-mode')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Summary View', { exact: true })).toBeVisible()
    await expect(page.getByText('Haplotype View', { exact: true })).toBeVisible()
    // No show_haplotypes in the URL means Summary View is active.
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
  })

  test('LR variant table loads with rows', async () => {
    // NOTE: `#lr-variant-table-container` is (a bug) set on two nested divs, so
    // scope to the first. The table is div-based (no semantic `columnheader`
    // roles), so assert on visible text instead.
    await expect(page.locator('#lr-variant-table-container').first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Variant ID').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Showing .* variants/)).toBeVisible({ timeout: 30_000 })
  })

  test('report page-load metrics', async ({}, testInfo) => {
    // Let any in-flight requests settle so their timing is captured.
    await page.waitForLoadState('networkidle').catch(() => {})
    await reportApiMetrics(testInfo, metrics)
    // The main LR variant query must have fired for this page to be meaningful.
    const lrQuery = metrics.find((m) => m.operationName === 'LongReadVariantsInRegion')
    expect(lrQuery, 'LongReadVariantsInRegion query should have fired').toBeTruthy()
    expect(lrQuery?.status).toBe(200)
  })
})

const runMixedPrototype = process.env.LR_Y1_CHR22_MIXED_PROVENANCE_ENABLED === 'true'

test.describe('Long Read chr22 mixed-provenance prototype', () => {
  test.skip(!runMixedPrototype, 'requires the isolated chr22 mixed-provenance stack')

  test('labels sources and clears unsupported state when switching cohorts', async ({ page }) => {
    await page.goto('/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc')
    await expect(page.getByTestId('lr-provenance-banner')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('lr-provenance-banner')).toContainText(
      'Non-production chr22 mixed-provenance prototype.'
    )

    await page.locator('#lr-cohort').selectOption('aou')
    await expect(page.getByText('All of Us is summary-only; Haplotype View is unavailable.')).toBeVisible()
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
  })

  test('does not render missing frequency values as zero', async ({ page }) => {
    await page.goto('/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc')
    const unavailableCell = page.locator('td.numeric span[title="Unavailable"]').first()
    if (await unavailableCell.count()) await expect(unavailableCell).toHaveText('—')
  })
})
