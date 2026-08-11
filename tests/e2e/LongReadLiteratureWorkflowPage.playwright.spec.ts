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

  test('routes the eight Batch 2 dossiers with exact, provisional, and blocked actions', async ({
    page,
  }) => {
    const records = [
      ['tcf4-repeat-negative-controls', 'Try in browser'],
      ['mlh1-allele-specific-methylation', 'Try in browser'],
      ['pkd1-pseudogene-origin', 'Open provisional locus overview'],
      ['smarcb1-mosaic-retrotransposon', 'Open provisional locus overview'],
      ['dmd-duplication-placement', null],
      ['prkn-complex-inversion-recurrence', null],
      ['pkd1-noncoding-splice-prioritization', 'Open provisional locus overview'],
      ['hereditary-cancer-benign-sv-reclassification', null],
    ] as const

    await page.goto('/long-read-literature-examples')
    const detailLinks = page.getByRole('link', { name: 'Detailed workflow' })
    await expect(detailLinks).toHaveCount(20)
    const detailHrefs = await detailLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href'))
    )
    records.forEach(([slug]) => {
      expect(detailHrefs).toContain(`/long-read-literature-examples/paper/${slug}`)
    })

    // One shared page must visit these routes serially to verify the index-to-detail flow.
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    for (const [slug, action] of records) {
      await page.goto(`/long-read-literature-examples/paper/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      if (action) {
        await expect(page.getByRole('link', { name: action })).toBeVisible()
      } else {
        await expect(
          page.getByRole('link', { name: /Try in browser|locus overview/i })
        ).toHaveCount(0)
        await expect(page.getByRole('status')).toContainText(/data-blocked|No safe CTA|No single/i)
      }
      if (slug === 'pkd1-pseudogene-origin') {
        await expect(
          page.getByRole('heading', {
            level: 1,
            name: 'Detecting PKD1 variants in polycystic kidney disease patients by single-molecule long-read sequencing',
          })
        ).toBeVisible()
      }
      if (
        slug === 'smarcb1-mosaic-retrotransposon' ||
        slug === 'prkn-complex-inversion-recurrence'
      ) {
        const renderedProse = await page.locator('body').innerText()
        expect(renderedProse).not.toContain('.;')
        expect(renderedProse).not.toMatch(/(^|[^.])\.\.([^.]|$)/)
      }
    }
    /* eslint-enable no-await-in-loop, no-restricted-syntax */
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
