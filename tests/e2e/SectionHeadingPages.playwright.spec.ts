import { expect, test } from '@playwright/test'

const sections = [
  { path: '/help', id: 'frequently-asked-questions', title: 'Frequently asked questions' },
  { path: '/data', id: 'v4-variants', title: 'Variants' },
  {
    path: '/stats',
    id: 'age-and-sex-distribution',
    title: 'What is the age and sex distribution in gnomAD?',
  },
]

;[1440, 320].forEach((width) => {
  test.describe(`Shared headings at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })

    sections.forEach(({ path, id, title }) => {
      test(`${path} preserves deep links and exposes a complete copy target`, async ({ page }) => {
        await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
        await page.goto(`${path}?dataset=gnomad_r4#${id}`)
        const heading = page.locator(`h2#${id}`)
        await expect(heading).toBeAttached()
        // Check the final layout after the shared scroll-settling window.
        await page.waitForTimeout(2200)
        await expect(heading).toBeInViewport()
        await page.reload()
        await expect(heading).toBeAttached()
        await page.waitForTimeout(2200)
        await expect(heading).toBeInViewport()

        const titleLayout = await heading.evaluate((element) => {
          const titleText = Array.from(element.childNodes).find(
            (node) => node.nodeType === Node.TEXT_NODE
          )!
          const firstCharacter = document.createRange()
          firstCharacter.setStart(titleText, 0)
          firstCharacter.setEnd(titleText, 1)
          const indent =
            firstCharacter.getBoundingClientRect().left - element.getBoundingClientRect().left
          const textRange = document.createRange()
          textRange.selectNodeContents(titleText)
          const textBox = textRange.getBoundingClientRect()
          const iconBox = element.querySelector('img')!.getBoundingClientRect()
          return {
            indent,
            verticalOffset: iconBox.y + iconBox.height / 2 - (textBox.y + textBox.height / 2),
          }
        })
        expect(Math.abs(titleLayout.indent)).toBeLessThanOrEqual(1)
        expect(Math.abs(titleLayout.verticalOffset)).toBeLessThanOrEqual(2)

        const link = heading.getByRole('link', { name: `Copy link to ${title}`, exact: true })
        await link.focus()
        await expect(link).toHaveCSS('opacity', '1')
        await expect(link).toBeInViewport({ ratio: 1 })
        const box = (await link.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
        const headingBox = (await heading.boundingBox())!
        expect(box.x + box.width).toBeLessThanOrEqual(headingBox.x + 1)
        if (path === '/help') {
          const subheadingBox = (await page
            .getByRole('heading', { name: 'General', exact: true })
            .boundingBox())!
          expect(Math.abs(headingBox.x - subheadingBox.x)).toBeLessThanOrEqual(1)
        }
        expect(
          await link.evaluate((element) => {
            const bounds = element.getBoundingClientRect()
            return element.contains(
              document.elementFromPoint(bounds.x + 1, bounds.y + bounds.height / 2)
            )
          })
        ).toBe(true)

        await page.keyboard.press('Enter')
        await expect(page.getByRole('status')).toHaveText('Link copied')
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
        expect(new URL(page.url()).hash).toBe(`#${id}`)
      })
    })
  })
})
