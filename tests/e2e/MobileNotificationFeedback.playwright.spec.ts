import { expect, test } from '@playwright/test'

const variants = [
  { family: 'structural', path: '/variant/DEL_CHR19_2C6DA7E7?dataset=gnomad_sv_r4' },
  { family: 'mitochondrial', path: '/variant/M-8602-T-C?dataset=gnomad_r4' },
  { family: 'STR', path: '/short-tandem-repeat/ATXN1?dataset=gnomad_r4' },
  { family: 'short', path: '/variant/1-55051215-G-GA?dataset=gnomad_r4' },
]
const screenSize = { width: 320, height: 720 }

test.describe('Mobile permalink feedback', () => {
  test.use({ viewport: screenSize, hasTouch: true, isMobile: true })

  variants.forEach(({ family, path }) => {
    ;[false, true].forEach((copyFails) => {
      test(`${family} keeps ${copyFails ? 'failure' : 'success'} feedback on screen`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(60_000)
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
        if (copyFails) {
          await page.addInitScript(() => {
            Object.defineProperty(navigator, 'clipboard', {
              configurable: true,
              value: { writeText: () => Promise.reject(new Error('Clipboard permission denied')) },
            })
          })
        }
        await page.goto(`${path}#age-distribution`)
        const link = page.getByRole('link', { name: 'Copy link to Age Distribution', exact: true })
        await expect(link).toBeAttached({ timeout: 45_000 })
        // Wait out the heading's scroll-settling window before measuring either viewport.
        await page.waitForTimeout(2500)
        const offsetBeforeCopy = await page.evaluate(() => window.visualViewport!.offsetTop)
        expect(offsetBeforeCopy, 'Fixture must pan the real visual viewport').toBeGreaterThan(0)
        const target = (await link.boundingBox())!
        expect(target.x).toBeGreaterThanOrEqual(0)
        expect(target.y).toBeGreaterThanOrEqual(0)
        expect(target.x + target.width).toBeLessThanOrEqual(screenSize.width)
        expect(target.y + target.height).toBeLessThanOrEqual(screenSize.height)
        // locator.tap() auto-scrolls, disturbing the visual viewport in overflowing mobile pages.
        await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2)

        const title = copyFails ? 'Unable to copy link' : 'Link copied'
        const card = page
          .locator('strong')
          .filter({ hasText: new RegExp(`^${title}$`) })
          .locator('..')
        await expect(card).toBeVisible()
        await expect(page.getByRole(copyFails ? 'alert' : 'status')).toHaveText(title)
        const feedback = (await card.boundingBox())!
        expect(feedback.x).toBeGreaterThanOrEqual(0)
        expect(feedback.y).toBeGreaterThanOrEqual(0)
        expect(feedback.x + feedback.width).toBeLessThanOrEqual(screenSize.width)
        expect(feedback.y + feedback.height).toBeLessThanOrEqual(screenSize.height)
        const viewport = await page.evaluate(() => ({
          offsetTop: window.visualViewport!.offsetTop,
          width: window.visualViewport!.width,
          height: window.visualViewport!.height,
        }))
        expect(viewport.offsetTop, 'Feedback must remain visible while panned').toBeGreaterThan(0)
        expect(new URL(page.url()).hash).toBe('#age-distribution')
        if (!copyFails) {
          expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
        }
        await testInfo.attach('visible-feedback', {
          body: await page.screenshot(),
          contentType: 'image/png',
        })
        await testInfo.attach('viewport-geometry', {
          body: JSON.stringify({ family, copyFails, offsetBeforeCopy, viewport, target, feedback }),
          contentType: 'application/json',
        })
      })
    })
  })
})
