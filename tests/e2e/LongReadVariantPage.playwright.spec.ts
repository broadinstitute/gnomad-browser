import { test, expect, type Page } from '@playwright/test'

import { collectApiMetrics, reportApiMetrics, type ApiMetric } from './helpers/lrMetrics'

const LR_DATASET = 'gnomad_r4_lr'
// Known TR variant in the guarded chr22 mixed-provenance fixture.
const TR_VARIANT = 'chr22-36280147-TRV-17~1'

test.describe('Long Read tandem-repeat variant page', () => {
  let page: Page
  let metrics: ApiMetric[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    metrics = collectApiMetrics(page)
    await page.goto(`/variant/${TR_VARIANT}?dataset=${LR_DATASET}`)
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('loads the live LR variant page and core details', async () => {
    await expect(page.getByText('Loading variant')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByText('Invalid Variant ID')).toHaveCount(0)
    await expect(page.getByText('Variant not found')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Long-Read Variant Details' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole('rowheader', { name: 'Allele type' })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Genetic Ancestry Group Frequencies' })
    ).toBeVisible()
  })

  test('renders available TR-specific content', async () => {
    const trSections = page.getByRole('heading', {
      name: /Tandem Repeat Reference Region|Allele Size Distribution|Genotype Distribution/,
    })
    await expect(trSections.first()).toBeVisible({ timeout: 20_000 })
  })

  test('reports a successful variant GraphQL request', async ({}, testInfo) => {
    await page.waitForLoadState('networkidle').catch(() => {})
    await reportApiMetrics(testInfo, metrics)
    const variantQuery = metrics.find((metric) => metric.operationName === 'Variant')
    expect(variantQuery, 'Variant query should have fired').toBeTruthy()
    expect(variantQuery?.status).toBe(200)
  })
})
