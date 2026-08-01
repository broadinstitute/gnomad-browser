import { test, expect, type Page } from '@playwright/test'

import { collectApiMetrics, reportApiMetrics, type ApiMetric } from './helpers/lrMetrics'

const LR_DATASET = 'gnomad_r4_lr'
// Known TR variant in the disposable Y1 chr22 fixture.
const TR_VARIANT = 'chr22-36280147-TRV-17~1'
const CHR22_TABLE_REGION = '22-36280000-36290000'
const CHR22_TABLE_VARIANTS = [
  'chr22-36280147-DEL-1~1', // four-part symbolic ID
  'chr22-36280147-TRV-17~1', // symbolic ID with provenance
  'chr22-36280195-C-T~1', // sequence ID with provenance
]

test.describe('Long Read variant table navigation', () => {
  test('real chr22 table links open resolved LR variant pages', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto(`/region/${CHR22_TABLE_REGION}?dataset=${LR_DATASET}`)
    await expect(page.locator('#lr-variant-table-container').first()).toBeVisible({
      timeout: 30_000,
    })

    for (const variantId of CHR22_TABLE_VARIANTS) {
      const link = page.getByRole('link', { name: variantId, exact: true }).first()
      await expect(link).toBeVisible({ timeout: 30_000 })

      const popupPromise = page.waitForEvent('popup')
      const variantResponsePromise = page.context().waitForEvent('response', {
        predicate: (response) => {
          const body = response.request().postData() || ''
          return (
            response.request().method() === 'POST' &&
            body.includes('GnomadVariant') &&
            body.includes(variantId)
          )
        },
      })
      await link.click()
      const variantPage = await popupPromise

      await expect(variantPage.getByText('Loading variant')).toHaveCount(0, { timeout: 30_000 })
      await expect(variantPage.getByText('Invalid Variant ID')).toHaveCount(0)
      await expect(variantPage.getByText('Variant not found')).toHaveCount(0)
      await expect(
        variantPage.getByRole('heading', { name: 'Long-Read Variant Details' })
      ).toBeVisible({ timeout: 30_000 })
      expect((await variantResponsePromise).status()).toBe(200)
      expect(decodeURIComponent(new URL(variantPage.url()).pathname)).toBe(`/variant/${variantId}`)
      await variantPage.close()
    }
  })

  test('haplotype table preserves canonical sequence and TR variant identities', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    await page.goto(
      `/region/22-36275000-36285000?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc&show_haplotypes=true`
    )
    const table = page.locator('#lr-variant-table-container table').first()
    await expect(table).toBeVisible({ timeout: 90_000 })

    const canonicalLinks = table.locator('a[href*="/variant/"][href*="~"]')
    await expect(canonicalLinks.first()).toBeVisible({ timeout: 90_000 })
    const hrefs = await canonicalLinks.evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute('href') || '')
    )
    const trHref = hrefs.find((href) => /-TRV-\d+~\d+/.test(href))
    const sequenceHref = hrefs.find((href) => /-[ACGTN]+-[ACGTN]+~\d+/i.test(href))
    expect(trHref, 'haplotype table should retain a canonical TRV link').toBeTruthy()
    expect(
      sequenceHref,
      'haplotype table should retain a canonical sequence-allele link'
    ).toBeTruthy()

    for (const href of [sequenceHref!, trHref!]) {
      const variantId = decodeURIComponent(href.match(/\/variant\/([^?]+)/)![1])
      const link = table.locator(`a[href="${href}"]`).first()
      const popupPromise = page.waitForEvent('popup')
      const responsePromise = page.context().waitForEvent('response', {
        predicate: (response) => {
          const body = response.request().postData() || ''
          return (
            response.request().method() === 'POST' &&
            body.includes('GnomadVariant') &&
            body.includes(variantId)
          )
        },
      })
      await link.click()
      const variantPage = await popupPromise
      await expect(
        variantPage.getByRole('heading', { name: 'Long-Read Variant Details' })
      ).toBeVisible({ timeout: 30_000 })
      await expect(
        variantPage.getByText(/Page Not Found|Invalid Variant ID|Variant not found/)
      ).toHaveCount(0)
      expect((await responsePromise).status()).toBe(200)
      expect(decodeURIComponent(new URL(variantPage.url()).pathname)).toBe(`/variant/${variantId}`)
      await variantPage.close()
    }
  })
})

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

  test('renders the current Y1 TR allelic series without legacy-only plots', async () => {
    await expect(page.getByRole('heading', { name: 'TR Allelic Series' })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.locator('svg[aria-label="TR ALT allele-length distribution"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Allele Size Distribution' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Genotype Distribution' })).toHaveCount(0)
  })

  test('reports a successful variant GraphQL request', async ({}, testInfo) => {
    await page.waitForLoadState('networkidle').catch(() => {})
    await reportApiMetrics(testInfo, metrics)
    const variantQuery = metrics.find((metric) => metric.operationName === 'Variant')
    expect(variantQuery, 'Variant query should have fired').toBeTruthy()
    expect(variantQuery?.status).toBe(200)
  })
})
