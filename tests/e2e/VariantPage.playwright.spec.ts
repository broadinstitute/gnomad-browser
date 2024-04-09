import { test, expect } from '@playwright/test'

test.describe('Variant page', () => {
  test('v4 renders without crashes', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: '-55051215-G-GA' }).click()

    // expect variant query to finish loading, and to render
    await expect(
      page.getByText('Insertion (1 base):1-55051215-G-GA (GRCh38)Copy variant IDGene page')
    ).toBeVisible()

    await expect(
      page.locator('table').filter({ hasText: 'ExomesGenomesTotalFilters' })
    ).toBeVisible()

    await expect(
      page.getByText('Genetic Ancestry Group Frequencies More informationgnomADHGDP1KGLocal')
    ).toBeVisible()

    await expect(page.getByText('Variant Effect PredictorThis')).toBeVisible()

    await page
      .getByText('Age Distribution More informationExomeGenomeVariant carriersAll individuals<')
      .click()
  })
})
