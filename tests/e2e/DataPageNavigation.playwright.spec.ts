import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

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
