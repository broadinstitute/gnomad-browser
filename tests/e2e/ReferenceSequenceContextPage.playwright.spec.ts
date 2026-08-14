import { expect, test } from '@playwright/test'

const topics = [
  ['Low short-read mappability', '6,473'],
  ['Segmental duplications', '189'],
  ['Long tandem repeats', '3,875'],
  ['Satellites', '65'],
  ['Reference gaps', '50'],
  ['Reference representation', '1'],
  ['Highly polymorphic immune loci', '1'],
] as const

test.describe('category-first reference sequence-context explorer', () => {
  test('lands on seven broad contexts without rows, featured examples, or runtime GIAB requests', async ({
    page,
  }) => {
    const externalRequests: string[] = []
    page.on('request', (request) => {
      if (/ncbi\.nlm\.nih\.gov|genome-in-a-bottle|giab/i.test(request.url())) {
        externalRequests.push(request.url())
      }
    })

    await page.goto('/reference-sequence-context')
    await expect(
      page.getByRole('heading', {
        name: 'Explore reference sequence contexts on chromosome 22',
      })
    ).toBeVisible()
    await expect(
      page.getByText('Choose a sequence context to see matching chromosome 22 regions.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /matching regions/ })).toHaveCount(7)
    await expect(page.getByTestId('context-region-row')).toHaveCount(0)
    await expect(page.getByTestId('featured-region-card')).toHaveCount(0)
    await expect(page.getByText('Why this region?')).toHaveCount(0)
    await expect(page.getByText('Start with a featured region')).toHaveCount(0)

    await page.reload()
    await expect(page.getByTestId('context-region-row')).toHaveCount(0)
    expect(externalRequests).toEqual([])
  })

  topics.forEach(([topic, count]) => {
    test(`maps ${topic} to an immediate compact result list`, async ({ page }) => {
      await page.goto('/reference-sequence-context')
      await page.getByRole('button', { name: new RegExp(`^${topic}`) }).click()
      await expect(page.getByRole('heading', { name: `Regions matching “${topic}”` })).toBeFocused()
      await expect(page.getByRole('status')).toContainText(new RegExp(`^${count} matching regions`))
      const numericCount = Number(count.replace(',', ''))
      await expect(page.getByTestId('context-region-row')).toHaveCount(
        numericCount < 50 ? numericCount : 50
      )
    })
  })

  test('keeps compact entries LR-summary-only and omits raw per-region evidence', async ({
    page,
  }) => {
    await page.goto('/reference-sequence-context')
    await page.getByRole('button', { name: /^Segmental duplications/ }).click()
    const row = page.getByTestId('context-region-row').first()
    await expect(row.getByText(/context types? · .* underlying source annotations?/)).toBeVisible()
    const href = await row
      .getByRole('link', { name: 'Explore long-read data' })
      .getAttribute('href')
    expect(href).toMatch(/^\/region\/22-\d+-\d+\?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc$/)
    expect(href).not.toContain('show_haplotypes')
    expect(href).not.toContain('dataset=gnomad_r4&')
    await expect(page.getByText('Why this region?')).toHaveCount(0)
    expect(await page.locator('body').innerText()).not.toMatch(/chr22 \d+ \d+/)
  })

  test('requires an explicit Show all action, paginates, and keeps source links in provenance', async ({
    page,
  }) => {
    await page.goto('/reference-sequence-context')
    await page.getByRole('button', { name: 'More filters ▾' }).click()
    await expect(
      page.getByRole('searchbox', { name: /Find coordinate or named source region/ })
    ).toBeVisible()
    await expect(page.getByTestId('context-region-row')).toHaveCount(0)

    await page.getByRole('button', { name: 'Show all regions' }).click()
    await expect(page.getByRole('status')).toContainText(/^9,440 matching regions/)
    await expect(page.getByTestId('context-region-row')).toHaveCount(50)
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 189')).toBeVisible()
    await expect(page.getByTestId('context-region-row')).toHaveCount(50)

    await page.getByText('Methods & provenance').click()
    await expect(page.getByRole('link', { name: 'Pinned source file' })).toHaveCount(7)
    await expect(page.getByRole('heading', { name: 'NIST data-use policy' })).toBeVisible()
  })

  test('supports keyboard category selection at 390px without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/reference-sequence-context')
    const topic = page.getByRole('button', { name: /^Segmental duplications/ })
    await topic.focus()
    await topic.press('Enter')
    await expect(
      page.getByRole('heading', { name: 'Regions matching “Segmental duplications”' })
    ).toBeFocused()
    await expect(page.getByRole('status')).toContainText(/^189 matching regions/)
    await page.getByRole('button', { name: 'More filters ▾' }).click()
    await expect(
      page.getByRole('searchbox', { name: /Find coordinate or named source region/ })
    ).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  })
})
