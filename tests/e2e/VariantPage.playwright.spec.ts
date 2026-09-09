import { test, expect } from '@playwright/test'

test.describe('Variant page', () => {
  test.describe('narrow touch viewport', () => {
    test.use({ viewport: { width: 320, height: 720 }, hasTouch: true, isMobile: true })

    test('keeps the whole permalink target and feedback on screen', async ({ page }) => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.goto('/variant/1-55051215-G-GA?dataset=gnomad_r4#age-distribution')
      const link = page.getByRole('link', { name: 'Copy link to Age Distribution' })
      await expect(link).toBeAttached({ timeout: 30_000 })
      await expect(link).toHaveCSS('opacity', '1')
      const target = await link.boundingBox()
      expect(target!.width).toBeGreaterThanOrEqual(44)
      expect(target!.height).toBeGreaterThanOrEqual(44)
      expect(target!.x).toBeGreaterThanOrEqual(0)
      expect(target!.x + target!.width).toBeLessThanOrEqual(320)
      await link.tap()

      const card = page
        .locator('strong')
        .filter({ hasText: /^Link copied$/ })
        .locator('..')
      await expect(card).toBeInViewport({ ratio: 1 })
      const feedback = await card.boundingBox()
      expect(feedback!.x).toBeGreaterThanOrEqual(0)
      expect(feedback!.x + feedback!.width).toBeLessThanOrEqual(320)
    })
  })

  test('v4 renders after navigating from the homepage', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: '-55051215-G-GA' }).click()

    await expect(
      page.getByText('Insertion (1 base):1-55051215-G-GA (GRCh38)Copy variant IDGene page')
    ).toBeVisible({ timeout: 30_000 })
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

  test('v4 deep link and copyable Age Distribution anchor work', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/variant/1-55051215-G-GA?dataset=gnomad_r4#age-distribution')

    await expect(
      page.getByText('Insertion (1 base):1-55051215-G-GA (GRCh38)Copy variant IDGene page')
    ).toBeVisible({ timeout: 30_000 })

    await expect(
      page.locator('table').filter({ hasText: 'ExomesGenomesTotalFilters' })
    ).toBeVisible()

    await expect(
      page.getByText('Genetic Ancestry Group Frequencies More informationgnomADHGDP1KGLocal')
    ).toBeVisible()

    await expect(page.getByText('Variant Effect PredictorThis')).toBeVisible()

    const ageDistributionLink = page.getByRole('link', {
      name: 'Copy link to Age Distribution',
    })
    await expect(ageDistributionLink).toBeAttached({ timeout: 30_000 })
    // Check the final layout, not merely an aligned frame inside the two-second settle window.
    await page.waitForTimeout(2200)
    expect(
      Math.abs(await ageDistributionLink.evaluate((link) => link.getBoundingClientRect().top))
    ).toBeLessThanOrEqual(2)

    const linkTarget = await ageDistributionLink.boundingBox()
    expect(linkTarget).not.toBeNull()
    expect(linkTarget!.width).toBeGreaterThanOrEqual(44)
    expect(linkTarget!.height).toBeGreaterThanOrEqual(44)
    await page.mouse.move(Math.max(linkTarget!.x + 2, 1), linkTarget!.y + linkTarget!.height / 2)
    await expect(ageDistributionLink).toHaveCSS('opacity', '1')

    await page.mouse.move(1200, 600)
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    // Fragment navigation sets the sequential focus starting point at the link.
    await page.keyboard.press('Shift+Tab')
    await expect(ageDistributionLink).not.toBeFocused()
    await page.keyboard.press('Tab')
    await expect(ageDistributionLink).toBeFocused()
    await expect(ageDistributionLink).toHaveCSS('opacity', '1')
    await page.keyboard.press('Enter')

    const copyNotification = page
      .locator('strong')
      .filter({ hasText: /^Link copied$/ })
      .locator('..')
    await expect(copyNotification).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('status')).toHaveText('Link copied')
    await expect
      .poll(() =>
        copyNotification.evaluate(
          (notification) => getComputedStyle(notification.parentElement!).position
        )
      )
      .toBe('fixed')
    expect(new URL(page.url()).hash).toBe('#age-distribution')
    expect(new URL(page.url()).searchParams.get('dataset')).toBe('gnomad_r4')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
  })
})
