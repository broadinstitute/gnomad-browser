import { test, expect, type Page } from '@playwright/test'

let page: Page

test.afterAll(async () => {
  await page.close()
})

test.describe('Structural variant region page', () => {
  test.describe('v4', () => {
    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage()
      await page.goto('region/19-11110640-11112638?dataset=gnomad_sv_r4')
    })
    test('region query', async () => {
      await expect(page.getByText('Loading region')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: '19-11110640-' })).toBeVisible({
        timeout: 20_000,
      })
    })

    test('coverage query', async () => {
      await expect(page.getByText('Loading coverage')).toHaveCount(0)
      await expect(
        page.getByText(
          'genomeMetric: MeanMedianOver 1Over 5Over 10Over 15Over 20Over 25Over 30Over 50Over 100Save plotFraction of individuals with coverage over'
        )
      ).toBeVisible({ timeout: 20_000 })
    })

    test('variants query', async () => {
      await expect(page.getByText('Loading variants')).toHaveCount(0)

      await expect(
        page.getByText(
          'Color variants byConsequenceClass11,110,64011,110,83911,111,03911,111,23911,111'
        )
      ).toBeVisible({ timeout: 20_000 })
    })
  })
})
