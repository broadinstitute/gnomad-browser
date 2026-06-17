import { test, expect, type Page } from '@playwright/test'

let page: Page

test.afterAll(async () => {
  await page.close()
})

// The find bar's "i of N" result counter.
const findBarCount = (p: Page) =>
  p.getByRole('search', { name: 'Find on page' }).locator('[aria-live="polite"]')

// Find shortcut: ⌘+F on macOS, Ctrl+F elsewhere.
const FIND_SHORTCUT = process.platform === 'darwin' ? 'Meta+f' : 'Control+f'

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

    test('Ctrl/Cmd+F opens the find bar and searches all variants', async () => {
      // Native-find suppression is covered by the Jest tests; here verify the
      // custom bar opens and drives the all-variant search.
      await expect(page.getByRole('columnheader', { name: 'Variant ID' })).toBeVisible({
        timeout: 20_000,
      })

      await page.locator('body').click()
      await page.keyboard.press(FIND_SHORTCUT)

      const findInput = page.getByPlaceholder('Find on page')
      await expect(findInput).toBeVisible()
      await expect(findInput).toBeFocused()

      // The query drives the table search but isn't shown in the on-page box.
      await findInput.fill('missense')
      const variantSearchBox = page.getByPlaceholder('Search variant table')
      await expect(variantSearchBox).toHaveValue('')
      // The on-page box is disabled while the find bar drives the search.
      await expect(
        page.locator('[aria-disabled="true"]').filter({ has: variantSearchBox })
      ).toBeVisible()
      // The find bar reports the current position out of all results ("i of N").
      await expect(findBarCount(page)).toHaveText(/^\d+ of \d+$/)

      await page.keyboard.press('Escape')
      await expect(findInput).toBeHidden()
      await expect(variantSearchBox).toHaveValue('')
    })

    test('find bar numbers results top-down: page text before variant rows', async () => {
      await page.locator('body').click()
      await page.keyboard.press(FIND_SHORTCUT)
      const findInput = page.getByPlaceholder('Find on page')
      await expect(findInput).toBeVisible()
      await findInput.fill('missense')

      // Result 1 is a page-text match above the table, so no variant row is the
      // active match yet.
      await expect(findBarCount(page)).toHaveText(/^1 of \d+$/)
      await expect(page.locator('.grid-row-highlight')).toHaveCount(0)

      // Advancing eventually crosses into the variant table, where a row becomes
      // the active match.
      let highlightedRows = await page.locator('.grid-row-highlight').count()
      for (let i = 0; i < 15 && highlightedRows === 0; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await findInput.press('Enter')
        // eslint-disable-next-line no-await-in-loop
        highlightedRows = await page.locator('.grid-row-highlight').count()
      }
      await expect(page.locator('.grid-row-highlight')).toHaveCount(1)

      await page.keyboard.press('Escape')
    })

    test('find bar Enter / Shift+Enter step through results and wrap', async () => {
      await page.locator('body').click()
      await page.keyboard.press(FIND_SHORTCUT)
      const findInput = page.getByPlaceholder('Find on page')
      await expect(findInput).toBeVisible()
      await findInput.fill('missense')

      const count = findBarCount(page)
      await expect(count).toHaveText(/^1 of \d+$/)
      const total = ((await count.textContent()) || '').split(' of ')[1]
      expect(Number(total)).toBeGreaterThan(3)

      await findInput.press('Enter')
      await expect(count).toHaveText(`2 of ${total}`)

      await findInput.press('Shift+Enter')
      await expect(count).toHaveText(`1 of ${total}`)

      // Wrap backward from the first result to the last.
      await findInput.press('Shift+Enter')
      await expect(count).toHaveText(`${total} of ${total}`)

      await page.keyboard.press('Escape')
    })

    test('Enter re-scrolls to the current variant match after scrolling away', async () => {
      await page.locator('body').click()
      await page.keyboard.press(FIND_SHORTCUT)
      const findInput = page.getByPlaceholder('Find on page')
      await expect(findInput).toBeVisible()

      // Use a real variant id from the table so the search has exactly one match.
      const rowText = (await page.locator('.grid-row').first().textContent()) || ''
      const variantId = rowText.match(/\d+-\d+-[ACGT]+-[ACGT]+/)?.[0] ?? ''
      expect(variantId).toBeTruthy()

      await findInput.fill(variantId)
      await expect(findBarCount(page)).toHaveText('1 of 1')

      const matchRow = page.locator('.grid-row-highlight')
      await expect(matchRow).toBeInViewport()

      // Scroll the window away from the table; the match leaves the viewport.
      await page.evaluate(() => window.scrollTo(0, 0))
      await expect(matchRow).not.toBeInViewport()

      // Pressing Enter on the single result re-scrolls it back into view.
      await findInput.press('Enter')
      await expect(matchRow).toBeInViewport()

      await page.keyboard.press('Escape')
    })
  })
})
