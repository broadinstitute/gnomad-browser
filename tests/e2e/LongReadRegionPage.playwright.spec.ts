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

  test('zoom controls narrow and reset the loaded region without navigation', async () => {
    await expect(page.getByText('Zoom Controls', { exact: true })).toBeVisible({ timeout: 20_000 })

    const originalUrl = page.url()
    await page.getByRole('button', { name: '3x' }).first().click()

    await expect(page.getByRole('button', { name: 'Set as region' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset zoom' })).toBeVisible()
    expect(page.url()).toBe(originalUrl)

    await page.getByRole('button', { name: 'Reset zoom' }).click()
    await expect(page.getByRole('button', { name: 'Set as region' })).toHaveCount(0)
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

  test('report page-load metrics', async ({ page: _unusedPage }, testInfo) => {
    // Let any in-flight requests settle so their timing is captured.
    await page.waitForLoadState('networkidle').catch(() => {})
    await reportApiMetrics(testInfo, metrics)
    // The main LR variant query must have fired for this page to be meaningful.
    const lrQuery = metrics.find((m) => m.operationName === 'LongReadVariantsInRegion')
    expect(lrQuery, 'LongReadVariantsInRegion query should have fired').toBeTruthy()
    expect(lrQuery?.status).toBe(200)
  })
})

test.describe('optional short-read coverage context', () => {
  const contextRegion = '4-39343424-39353479'

  test('is request-free while off, then uses gnomad_r4 and preserves URL state', async ({
    page,
  }) => {
    const shortReadRequests: any[] = []
    await page.route('**/api/', async (route) => {
      const body = route.request().postDataJSON()
      if (body?.operationName !== 'RegionCoverage') {
        await route.continue()
        return
      }
      shortReadRequests.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            region: {
              coverage: {
                exome: [{ pos: 39344000, over_20: 0.95 }],
                genome: [{ pos: 39344000, over_20: 0.9 }],
              },
            },
          },
        }),
      })
    })

    await page.goto(
      `/region/${contextRegion}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc&show_haplotypes=true&variant_id=kept&other=kept`
    )
    const toggle = page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    await expect(toggle).toBeVisible({ timeout: 20_000 })
    await expect(toggle).not.toBeChecked()
    expect(shortReadRequests).toHaveLength(0)

    await toggle.press('Space')
    await expect(toggle).toBeChecked()
    await expect.poll(() => shortReadRequests.length).toBe(1)
    expect(shortReadRequests[0].variables).toMatchObject({
      datasetId: 'gnomad_r4',
      referenceGenome: 'GRCh38',
      includeExomeCoverage: true,
      includeGenomeCoverage: true,
    })
    const params = new URL(page.url()).searchParams
    expect(params.get('show_short_read_coverage')).toBe('true')
    expect(params.get('lr_cohort')).toBe('hgsvc_hprc')
    expect(params.get('show_haplotypes')).toBe('true')
    expect(params.get('variant_id')).toBe('kept')
    expect(params.get('other')).toBe('kept')
    await expect(page.getByText('Short-read exomes (gnomAD v4.0)')).toBeVisible()
    await expect(page.getByText('Short-read genomes (gnomAD v3.0.1)')).toBeVisible()
    await page.getByRole('button', { name: 'About short-read coverage context' }).click()
    await expect(
      page.getByText(/Different samples, assays, and processing pipelines/)
    ).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('#lr-coverage-metric')).toHaveCount(1)
    await expect(page.locator('#sr-coverage-metric')).toHaveCount(1)
    const coveragePlotHeights = await page
      .locator('#lr-coverage-metric, #sr-coverage-metric')
      .evaluateAll((controls) =>
        controls.map((control) => {
          let container = control.parentElement
          while (container && !container.querySelector('svg')) container = container.parentElement
          return container?.querySelector('svg')?.getAttribute('height')
        })
      )
    expect(coveragePlotHeights).toEqual(['100', '100'])

    await toggle.press('Space')
    await expect(toggle).not.toBeChecked()
    expect(new URL(page.url()).searchParams.get('show_short_read_coverage')).toBeNull()
    await expect(page.locator('#sr-coverage-metric')).toHaveCount(0)
  })

  test('offers the opt-in at the bounded chr22 acceptance loci', async ({ page }) => {
    const expectOptInAt = async (region: string) => {
      await page.goto(`/region/${region}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc`)
      await expect(
        page.getByRole('checkbox', { name: 'Show short-read coverage context' })
      ).toBeVisible({ timeout: 20_000 })
    }

    await expectOptInAt('22-21227238-21327237')
    await expectOptInAt('22-22424495-22524494')
    await expectOptInAt('22-42123192-42132193')
  })

  test('is guarded on X and remains operable without overflow on mobile', async ({ page }) => {
    await page.goto(`/region/X-2781000-2782000?dataset=${LR_DATASET}&show_short_read_coverage=true`)
    await expect(
      page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    ).toHaveCount(0)
    await expect(page.getByText(/available only for GRCh38 autosomes 1–22/)).toBeVisible({
      timeout: 20_000,
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/region/${contextRegion}?dataset=${LR_DATASET}`)
    const toggle = page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    await expect(toggle).toBeVisible({ timeout: 20_000 })
    const box = await toggle.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(20)
    const horizontallyOverflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(horizontallyOverflowing).toBe(false)
  })
})

const runY1 = process.env.LR_Y1_ENABLED === 'true'

test.describe('Long Read Y1 mode', () => {
  test.skip(!runY1, 'requires a configured Y1 stack containing chr22')

  test('switches cohorts, clears unsupported state, and keeps the AoU notice in view help', async ({
    page,
  }) => {
    await page.goto(
      '/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true'
    )

    const cohortOptions = page.getByRole('group', { name: 'Long-read cohort:' })
    await expect(cohortOptions.getByRole('radio', { name: 'HGSVC/HPRC' })).toBeChecked()
    await cohortOptions.getByRole('radio', { name: 'All of Us' }).click()

    await expect(cohortOptions.getByRole('radio', { name: 'All of Us' })).toBeChecked()
    expect(new URL(page.url()).searchParams.get('lr_cohort')).toBe('aou')
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
    await expect(
      page.getByText('All of Us is summary-only; Haplotype View is unavailable.')
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Long Read Data Views' }).click()
    await expect(
      page.getByText('All of Us is summary-only; Haplotype View is unavailable.')
    ).toBeVisible()
  })

  test('does not render missing frequency values as zero', async ({ page }) => {
    await page.goto('/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc')
    const unavailableCell = page.locator('td.numeric span[title="Unavailable"]').first()
    await expect(unavailableCell).toBeVisible()
    await expect(unavailableCell).toHaveText('—')
  })
})
