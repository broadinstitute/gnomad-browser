import { test, expect, type Page } from '@playwright/test'

let page: Page

test.afterAll(async () => {
  await page.close()
})

test.describe('Gene page', () => {
  test.describe('v4', () => {
    // Make one API call on the gene page and share that result with other tests
    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage()
      await page.goto('/')
      await page.getByRole('link', { name: 'PCSK9' }).click()
    })

    test('gene query', async () => {
      await expect(page.getByText('Loading gene')).toHaveCount(0)

      await expect(
        page.getByText('PCSK9 proprotein convertase subtilisin/kexin type 9DatasetgnomAD v4.1.')
      ).toBeVisible({ timeout: 10_000 })
    })

    test('coverage query', async () => {
      await expect(page.getByText('Loading coverage')).toHaveCount(0)

      await expect(
        page.getByText(
          'Fraction of individuals with coverage over 200.10.20.30.40.50.60.70.80.91.0'
        )
      ).toBeVisible({ timeout: 20_000 })
    })

    test('variants query', async () => {
      await expect(page.getByText('Loading variants'))
        .toHaveCount(0, { timeout: 30_000 })
        .catch(() => {
          throw new Error('gene page variants query timed out after 30s')
        })

      await expect(page.getByRole('columnheader', { name: 'Variant ID' })).toBeVisible({
        timeout: 20_000,
      })
    })
  })
})
