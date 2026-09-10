import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

type SettlingWindow = typeof window & {
  hashSettling: { firstFrame?: number; hashChanged?: number }
}

test('Data table of contents renders links and follows navigation and scrolling', async ({
  page,
}) => {
  await page.goto('/data?dataset=gnomad_r4')
  const contents = page.getByRole('navigation', { name: 'Data sections' })
  await expect(contents.getByRole('link')).toHaveText([
    'Summary',
    'v4 Downloads',
    'v3 Downloads',
    'v2 Liftover Downloads',
    'v2 Downloads',
    'ExAC Downloads',
    'gnomAD API',
  ])

  const v3Link = contents.getByRole('link', { name: 'v3 Downloads', exact: true })
  await v3Link.click()
  await expect(page.locator('h2#v3')).toBeInViewport()
  await expect(v3Link.locator('..')).toHaveCSS('font-weight', '700')

  const hgdpLink = contents.getByRole('link', { name: 'HGDP + 1KG callset', exact: true })
  await expect(hgdpLink).toHaveAttribute('href', '#v3-hgdp-1kg')
  await hgdpLink.click()
  await expect(page.locator('h2#v3-hgdp-1kg')).toBeInViewport()
  await expect(hgdpLink.locator('..')).toHaveCSS('font-weight', '700')
  await expect
    .poll(() =>
      page
        .locator('h2#v3-hgdp-1kg')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top))
    )
    .toBeLessThanOrEqual(2)

  const v2Offset = await page
    .locator('h2#v2')
    .evaluate((element) => element.getBoundingClientRect().top)
  await page.mouse.move(600, 450)
  await page.mouse.wheel(0, v2Offset - 20)
  const v2Link = contents.getByRole('link', { name: 'v2 Downloads', exact: true })
  await expect(v2Link.locator('..')).toHaveCSS('font-weight', '700')
  await expect(
    contents.getByRole('link', { name: 'Linkage disequilibrium', exact: true })
  ).toHaveAttribute('href', '#v2-linkage-disequilibrium')
  await expect(hgdpLink).toHaveCount(0)
})
;['browser Back after reload', 'a new fragment'].forEach((navigation) => {
  test(`Data hash settling yields to ${navigation}`, async ({ page }) => {
    await page.addInitScript(() => {
      const trace: SettlingWindow['hashSettling'] = {}
      ;(window as SettlingWindow).hashSettling = trace
      const getBoundingClientRect = Element.prototype.getBoundingClientRect
      // Observe the hook's first target measurement without changing real browser geometry.
      Element.prototype.getBoundingClientRect = function measureTarget() {
        if (this.id === 'v4' && location.hash === '#v4' && trace.firstFrame === undefined) {
          trace.firstFrame = performance.now()
        }
        return getBoundingClientRect.call(this)
      }
      window.addEventListener('hashchange', () => {
        if (trace.firstFrame !== undefined && trace.hashChanged === undefined) {
          trace.hashChanged = performance.now()
        }
      })
    })

    if (navigation === 'browser Back after reload') {
      await page.goto('/data?dataset=gnomad_r4')
      await expect(page.locator('h2#v3')).toBeAttached()
      await page.goto('/data?dataset=gnomad_r4#v3')
      await page.goto('/data?dataset=gnomad_r4#v4')
      await page.reload({ waitUntil: 'commit' })
    } else {
      await page.goto('/data?dataset=gnomad_r4#v4', { waitUntil: 'commit' })
    }
    await page.waitForFunction(
      () => (window as SettlingWindow).hashSettling.firstFrame !== undefined
    )

    // Toolbar/address-bar navigation does not dispatch the page input that cancels settling.
    if (navigation === 'browser Back after reload') {
      await page.goBack({ waitUntil: 'commit' })
    } else {
      await page.goto('/data?dataset=gnomad_r4#v3', { waitUntil: 'commit' })
    }
    await page.waitForFunction(
      () => (window as SettlingWindow).hashSettling.hashChanged !== undefined
    )
    const trace = await page.evaluate(() => (window as SettlingWindow).hashSettling)
    expect(trace.hashChanged! - trace.firstFrame!).toBeLessThan(1000)

    // The new target must still win after the entire two-second settling window.
    await page.waitForTimeout(2200)
    expect(new URL(page.url()).hash).toBe('#v3')
    await expect
      .poll(() =>
        page.locator('h2#v3').evaluate((element) => Math.abs(element.getBoundingClientRect().top))
      )
      .toBeLessThanOrEqual(2)
  })
})

test('Data deep links settle promptly even with smooth scrolling enabled', async ({ page }) => {
  await page.goto('/data?dataset=gnomad_r4#v4-variants', { waitUntil: 'commit' })
  const heading = page.locator('h2#v4-variants')
  await expect(heading).toBeAttached()
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'smooth')

  // A restarted smooth scroll remains stationary for the entire two-second retry window.
  await expect
    .poll(() => heading.evaluate((element) => Math.abs(element.getBoundingClientRect().top)), {
      timeout: 1000,
    })
    .toBeLessThanOrEqual(2)
})
