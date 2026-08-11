import { expect, test } from '@playwright/test'

test.describe('Long-read literature workflow detail', () => {
  test('keeps guarded PALB2, D4Z4, and WRN decisions explicit', async ({ page }) => {
    await page.goto('/long-read-literature-examples/paper/palb2-linked-duplication-breakpoints')
    await expect(page.getByRole('link', { name: 'Try in browser' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Open provisional locus overview' })).toBeVisible()
    await expect(page.getByRole('status')).toContainText('not a verified event destination')

    await page.goto('/long-read-literature-examples/paper/d4z4-length-methylation')
    await expect(page.getByRole('link', { name: 'Try in browser' })).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('No safe linear GRCh38 region')
    await expect(page.getByText('Only partial molecules cover the array')).toBeVisible()
    await expect(
      page.getByText('Joined capability is unavailable or receipt identity is stale')
    ).toBeVisible()

    await page.goto('/long-read-literature-examples/paper/wrn-trans-deletion-haplotype')
    await expect(
      page.getByText('PS is missing, discontinuous, or copy assignment is ambiguous')
    ).toBeVisible()
    await expect(
      page.getByText('A user asks the browser to diagnose, classify, or prove patient trans phase')
    ).toBeVisible()
  })

  test('contains the capability matrix at a 390 px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/long-read-literature-examples/paper/wrn-trans-deletion-haplotype')

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Targeted long-read sequencing identifies missing pathogenic variants/i,
      })
    ).toBeVisible()

    const matrixRegion = page.getByRole('region', { name: /scrollable capability matrix/i })
    await expect(matrixRegion).toBeVisible()
    await expect(matrixRegion).toHaveAttribute('tabindex', '0')

    const widths = await page.evaluate(() => {
      const region = document.querySelector<HTMLElement>(
        '[aria-label^="Scrollable capability matrix"]'
      )!
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        matrixClientWidth: region.clientWidth,
        matrixScrollWidth: region.scrollWidth,
      }
    })

    expect(widths.documentScrollWidth).toBeLessThanOrEqual(widths.documentClientWidth)
    expect(widths.matrixScrollWidth).toBeGreaterThan(widths.matrixClientWidth)

    await matrixRegion.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => matrixRegion.evaluate((region) => region.scrollLeft)).toBeGreaterThan(0)
  })
})
