import { test, expect, type Page } from '@playwright/test'

let page: Page
test.afterAll(async () => {
  await page.close()
})
test.describe('Region page', () => {
  test.describe('v4', () => {
    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage()
      await page.goto('/region/1-55050934-55053465')
    })

    test('region query', async () => {
      await expect(page.getByText('Loading region')).toHaveCount(0)
      await expect(
        page.getByText('1-55050934-55053465ChangeDatasetgnomAD v4.0.0GRCh38gnomAD v4.0.0807,162')
      ).toBeVisible({ timeout: 20_000 })
    })

    test('coverage query', async () => {
      await expect(page.getByText('Loading coverage')).toHaveCount(0)
      await expect(
        page.getByText(
          'Fraction of individuals with coverage over 200.10.20.30.40.50.60.70.80.91.0'
        )
      ).toBeVisible({ timeout: 30_000 })
    })

    test('variants query', async () => {
      await expect(page.getByText('Loading variants')).toHaveCount(0)
      await expect(page.getByRole('columnheader', { name: 'Variant ID' })).toBeVisible({
        timeout: 30_000,
      })
    })
  })
})
