import { test, expect, type Page, type Route } from '@playwright/test'

const QUERY_TIMEOUT_MS = 30_000
const RENDER_TIMEOUT_MS = 20_000

// Look for uncaught errors, which are what produce the generic
// "Something Went Wrong" page.
const collectUncaughtErrors = (target: Page): Error[] => {
  const errors: Error[] = []
  target.on('pageerror', (error) => {
    errors.push(error)
  })
  return errors
}

const openPcsk9GenePage = async (target: Page) => {
  await target.goto('/')
  await target.getByRole('link', { name: 'PCSK9' }).click()
  await expect(target.getByText('Loading gene')).toHaveCount(0, { timeout: QUERY_TIMEOUT_MS })
}

const expectNoCrashPage = async (target: Page, uncaughtErrors: Error[]) => {
  await expect(target.getByRole('heading', { name: 'Something Went Wrong' })).toHaveCount(0)
  expect(uncaughtErrors.map((error) => error.message)).toEqual([])
}

const simulateClinvarVariants = (replacement: null | []) => async (route: Route) => {
  const response = await route.fetch()
  const body = await response.json()

  ;['gene', 'region', 'transcript'].forEach((feature) => {
    const featureData = body?.data?.[feature]
    if (featureData && 'clinvar_variants' in featureData) {
      featureData.clinvar_variants = replacement
    }
  })

  await route.fulfill({ response, json: body })
}

test.describe('Gene page ClinVar track, real API data', () => {
  let page: Page
  let uncaughtErrors: Error[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    uncaughtErrors = collectUncaughtErrors(page)
    await openPcsk9GenePage(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('renders the ClinVar track', async () => {
    await expect(page.getByRole('heading', { name: 'ClinVar variants' })).toBeVisible({
      timeout: QUERY_TIMEOUT_MS,
    })

    await expect(page.getByText(/ClinVar variants could not be loaded/)).toHaveCount(0)
    await expect(page.getByText(/No ClinVar variants found in this gene/)).toHaveCount(0)
    await expect(page.getByText(/Data displayed here is from ClinVar/)).toBeVisible()

    await expectNoCrashPage(page, uncaughtErrors)
  })

  test('expands to all variants without crashing', async () => {
    const expandButton = page.getByRole('button', { name: 'Expand to all variants' })
    await expect(expandButton).toBeVisible({ timeout: RENDER_TIMEOUT_MS })

    await expandButton.click()

    await expect(page.getByRole('button', { name: 'Collapse to bins' })).toBeVisible()
    await expectNoCrashPage(page, uncaughtErrors)
  })
})

test.describe('Gene page ClinVar track, simulated null clinvar_variants', () => {
  let page: Page
  let uncaughtErrors: Error[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    uncaughtErrors = collectUncaughtErrors(page)
    await page.route('**/api/**', simulateClinvarVariants(null))
    await openPcsk9GenePage(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('reports that ClinVar could not be loaded, and does not crash', async () => {
    await expect(page.getByRole('heading', { name: 'ClinVar variants' })).toBeVisible({
      timeout: QUERY_TIMEOUT_MS,
    })
    await expect(page.getByText(/ClinVar variants could not be loaded/)).toBeVisible({
      timeout: QUERY_TIMEOUT_MS,
    })

    await expect(page.getByText(/No ClinVar variants found in this gene/)).toHaveCount(0)

    await expectNoCrashPage(page, uncaughtErrors)
  })

  test('still renders the gnomAD variant table', async () => {
    await expect(page.getByText('Loading variants'))
      .toHaveCount(0, { timeout: QUERY_TIMEOUT_MS })
      .catch(() => {
        throw new Error(`gene page variants query timed out after ${QUERY_TIMEOUT_MS / 1000}s`)
      })

    await expect(page.getByRole('columnheader', { name: 'Variant ID' })).toBeVisible({
      timeout: RENDER_TIMEOUT_MS,
    })
    await expectNoCrashPage(page, uncaughtErrors)
  })
})

test.describe('Gene page ClinVar track, simulated empty clinvar_variants', () => {
  let page: Page
  let uncaughtErrors: Error[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    uncaughtErrors = collectUncaughtErrors(page)
    await page.route('**/api/**', simulateClinvarVariants([]))
    await openPcsk9GenePage(page)
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('reports that none were found, and does not crash', async () => {
    await expect(page.getByRole('heading', { name: 'ClinVar variants' })).toBeVisible({
      timeout: QUERY_TIMEOUT_MS,
    })
    await expect(page.getByText('No ClinVar variants found in this gene.')).toBeVisible({
      timeout: QUERY_TIMEOUT_MS,
    })

    await expect(page.getByText(/ClinVar variants could not be loaded/)).toHaveCount(0)
    await expect(page.getByText(/Data displayed here is from ClinVar/)).toHaveCount(0)

    await expectNoCrashPage(page, uncaughtErrors)
  })
})
