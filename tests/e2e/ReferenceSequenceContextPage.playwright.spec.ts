import { expect, test } from '@playwright/test'

const topics = [
  ['Duplicated sequence', '189'],
  ['Low short-read mappability', '6,473'],
  ['Long tandem repeats', '3,875'],
  ['Satellites / reference gaps', '79'],
  ['IGL locus', '1'],
  ['GRCh38 false duplication', '1'],
] as const

test.describe('guided reference sequence-context explorer', () => {
  test('lands on guided examples without mounting the advanced table or fetching GIAB', async ({
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
      page.getByRole('heading', { name: 'Explore chr22 sequence contexts with long-read data' })
    ).toBeVisible()
    await expect(page.getByText('Pilot / experimental')).toBeVisible()
    await expect(page.getByTestId('featured-region-card')).toHaveCount(3)
    await expect(page.getByTestId('context-region-row')).toHaveCount(0)

    const expected = [
      '/region/22-21227238-21327237?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc',
      '/region/22-22424495-22524494?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc',
      '/region/22-42123192-42132193?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc',
    ]
    const cards = page.getByTestId('featured-region-card')
    await Promise.all(
      expected.map(async (expectedHref, index) => {
        const href = await cards
          .nth(index)
          .getByRole('link', { name: 'Explore long-read data' })
          .getAttribute('href')
        expect(href).toBe(expectedHref)
        expect(href).not.toContain('show_haplotypes')
        expect(href).not.toContain('dataset=gnomad_r4&')
      })
    )

    await page.reload()
    await expect(page.getByTestId('featured-region-card')).toHaveCount(3)
    expect(externalRequests).toEqual([])
  })

  test('reveals featured explanation and exact pinned evidence with the keyboard', async ({
    page,
  }) => {
    await page.goto('/reference-sequence-context')
    const cypCard = page
      .getByTestId('featured-region-card')
      .filter({ hasText: 'CYP2D6/CYP2D7 area' })
    const disclosure = cypCard.getByRole('button', { name: 'Why this region?' })
    await disclosure.focus()
    await disclosure.press('Enter')
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    await expect(cypCard.getByText(/BED chr22 42123191 42132193/)).toBeVisible()
    await expect(
      cypCard.getByText(/do not establish coverage, callability, accuracy/)
    ).toBeVisible()
  })

  topics.forEach(([topic, count]) => {
    test(`maps ${topic} to the advanced browser and announces results`, async ({ page }) => {
      await page.goto('/reference-sequence-context')
      const topicButton = page.getByRole('button', { name: new RegExp(`^${topic}`) })
      await topicButton.click()
      await expect(
        page.getByRole('heading', { name: 'Advanced GIAB region browser' })
      ).toBeFocused()
      await expect(page.getByText(new RegExp(`Showing ${count} of 9,440`))).toBeVisible()
      await expect(
        page.getByRole('checkbox', { name: /Multiple source contexts only/ })
      ).not.toBeChecked()
      await expect(page.getByLabel('Match contexts')).toHaveValue('any')
      const numericCount = Number(count.replace(',', ''))
      await expect(page.getByTestId('context-region-row')).toHaveCount(
        numericCount < 50 ? numericCount : 50
      )
    })
  })

  test('opens the advanced default, preserves exact evidence, and bounds row LR actions', async ({
    page,
  }) => {
    await page.goto('/reference-sequence-context')
    await page.getByRole('button', { name: /Advanced: browse all 9,440/ }).click()
    await expect(page.getByText(/Showing 1,005 of 9,440/)).toBeVisible()
    await expect(page.getByTestId('context-region-row')).toHaveCount(50)

    await page.getByRole('searchbox', { name: /Find coordinate or reviewed locus/ }).fill('IGL')
    await expect(page.getByText(/Showing 1 of 9,440/)).toBeVisible()
    const row = page.getByTestId('context-region-row')
    await row.getByRole('button', { name: 'Why this region?' }).press('Enter')
    await expect(page.getByText(/BED chr22 22026075 22922912/)).toBeVisible()

    const lrHref = await row
      .getByRole('link', { name: 'Explore long-read data' })
      .getAttribute('href')
    expect(lrHref).toContain('dataset=gnomad_r4_lr')
    expect(lrHref).toContain('lr_cohort=hgsvc_hprc')
    expect(lrHref).not.toContain('show_haplotypes')
    const match = lrHref!.match(/\/region\/22-(\d+)-(\d+)\?/)
    expect(match).not.toBeNull()
    expect(Number(match![2]) - Number(match![1]) + 1).toBeLessThanOrEqual(100_000)
  })

  test('works at 390px without horizontal overflow and supports topic keyboard activation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/reference-sequence-context')
    const topic = page.getByRole('button', { name: /^IGL locus/ })
    await topic.focus()
    await topic.press('Enter')
    await expect(page.getByText(/Showing 1 of 9,440/)).toBeVisible()
    const filterButton = page.getByRole('button', { name: 'Show filters' })
    await expect(filterButton).toBeVisible()
    await filterButton.click()
    await expect(
      page.getByRole('searchbox', { name: /Find coordinate or reviewed locus/ })
    ).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1)
  })
})
