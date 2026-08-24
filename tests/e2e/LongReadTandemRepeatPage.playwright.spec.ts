import { expect, test, type Page, type TestInfo } from '@playwright/test'

const COMPOUND_LOCUS =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'
const SPARSE_LOCUS = '1-121606499-121606508-AG+1-121606517-121606536-A'
type Cohort = 'hgsvc_hprc' | 'aou'

const datasetQuery = (cohort: Cohort) => `dataset=gnomad_r4_lr&lr_cohort=${cohort}`

const isGraphqlOperation = (response: any, operation: string) => {
  const request = response.request()
  return request.method() === 'POST' && (request.postData() || '').includes(operation)
}

const waitForLocusResponse = (page: Page) =>
  page.waitForResponse((response) => isGraphqlOperation(response, 'LongReadTandemRepeatLocus'))

const exactIndexForCount = (page: Page, exactAlleleCount: number) => {
  const heading = page.getByRole('heading', {
    name: `All exact ALTs (${exactAlleleCount})`,
  })
  return { heading, index: heading.locator('xpath=..') }
}

const openLocus = async (
  page: Page,
  locusId: string,
  exactAlleleCount: number,
  cohort: Cohort = 'hgsvc_hprc'
) => {
  const responsePromise = waitForLocusResponse(page)
  await page.goto(`/tandem-repeat/${locusId}?${datasetQuery(cohort)}`)
  const { heading, index } = exactIndexForCount(page, exactAlleleCount)
  await expect(heading).toBeVisible({ timeout: 30_000 })
  await expect(index.getByRole('table', { name: 'Exact alternate allele index' })).toBeVisible()
  await expect(index.locator('details')).toHaveCount(0)
  await expect(index.getByRole('table', { name: 'Exact alternate allele index' })).toHaveAttribute(
    'aria-rowcount',
    String(exactAlleleCount + 1)
  )
  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect((await response.json()).errors).toBeUndefined()

  return index
}

const selectExactAllele = async (
  page: Page,
  locusId: string,
  altIndex: number,
  exactAlleleCount: number,
  cohort: Cohort = 'hgsvc_hprc',
  activation: 'pointer' | 'keyboard' = 'pointer'
) => {
  const { index } = exactIndexForCount(page, exactAlleleCount)
  const indexScroller = index.locator('.lr-tr-exact-index-scroll')
  const requestedScrollTop = altIndex > 10 ? (altIndex - 1) * 44 : 0
  const indexScrollTop = await indexScroller.evaluate((element, top) => {
    element.scrollTo({ top })
    return element.scrollTop
  }, requestedScrollTop)
  if (requestedScrollTop > 0) expect(indexScrollTop).toBeGreaterThan(0)

  const exactLink = index.getByRole('link', { name: `ALT ${altIndex}`, exact: true }).first()
  await expect(exactLink).toBeVisible()
  await exactLink.scrollIntoViewIfNeeded()
  if (activation === 'keyboard') await exactLink.focus()
  const href = await exactLink.getAttribute('href')
  const selectedUrl = new URL(href!, 'http://localhost')
  expect(decodeURIComponent(selectedUrl.pathname)).toBe(`/tandem-repeat/${locusId}`)
  expect(selectedUrl.searchParams.get('dataset')).toBe('gnomad_r4_lr')
  expect(selectedUrl.searchParams.get('lr_cohort')).toBe(cohort)
  expect(selectedUrl.searchParams.get('allele')).toMatch(new RegExp(`~${altIndex}$`))

  const documentMarker = await page.evaluate(() => {
    const marker = `lr-tr-${Date.now()}-${Math.random()}`
    ;(window as any).__lrTrDocumentMarker = marker
    return marker
  })

  let releaseDetailRequest!: () => void
  const detailRequestGate = new Promise<void>((resolve) => {
    releaseDetailRequest = resolve
  })
  const gateSelectedDetail = async (route: any) => {
    const request = route.request()
    if (
      request.method() === 'POST' &&
      (request.postData() || '').includes('LongReadTandemRepeatLocus') &&
      request.postDataJSON().variables.allele === selectedUrl.searchParams.get('allele')
    ) {
      await detailRequestGate
    }
    await route.continue()
  }
  await page.route('**/api/**', gateSelectedDetail)

  const selectionRequests: string[] = []
  const recordSelectionRequest = (request: any) => {
    if (
      request.method() === 'POST' &&
      (request.postData() || '').includes('LongReadTandemRepeatLocus')
    ) {
      selectionRequests.push(request.postData() || '')
    }
  }
  page.on('request', recordSelectionRequest)
  const beforeSelection = {
    ...(await page.evaluate(() => ({
      navigationCount: performance.getEntriesByType('navigation').length,
      scrollY: window.scrollY,
    }))),
    listScrollTop: await indexScroller.evaluate((element) => element.scrollTop),
  }
  const browserSentinel = await page
    .getByTestId('lr-tr-exact-allele-browser')
    .evaluate((element) => {
      const sentinel = `lr-tr-browser-${Date.now()}-${Math.random()}`
      const browserElement = element as any
      browserElement.__lrTrBrowserSentinel = sentinel
      return sentinel
    })

  const responsePromise = waitForLocusResponse(page)
  if (activation === 'keyboard') {
    await exactLink.press('Enter')
  } else {
    await exactLink.dispatchEvent('mousedown', { button: 0 })
    await exactLink.dispatchEvent('mouseup', { button: 0 })
    await exactLink.dispatchEvent('click', { button: 0 })
  }
  await expect(exactLink).toHaveAttribute('aria-current', 'true')
  const clickedScrollTop = await indexScroller.evaluate((element) => element.scrollTop)
  if (requestedScrollTop > 0) expect(clickedScrollTop).toBeGreaterThan(0)
  expect(Math.abs(clickedScrollTop - beforeSelection.listScrollTop)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('heading', { name: /^Allelic landscape$/ })).toBeVisible()
  await expect(index).toBeVisible()
  await expect(page.getByText('Loading tandem-repeat locus')).toBeHidden()
  expect(await page.evaluate(() => (window as any).__lrTrDocumentMarker)).toBe(documentMarker)
  expect(
    await page
      .getByTestId('lr-tr-exact-allele-browser')
      .evaluate((element) => (element as any).__lrTrBrowserSentinel)
  ).toBe(browserSentinel)
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - beforeSelection.scrollY)
  ).toBeLessThanOrEqual(1)
  releaseDetailRequest()
  const response = await responsePromise
  const responseBody = await response.json()
  const selected = responseBody.data.long_read_tandem_repeat_locus.selected_allele
  expect(response.status()).toBe(200)
  expect(responseBody.errors).toBeUndefined()
  expect(selected.variant_id).toBe(selectedUrl.searchParams.get('allele'))
  expect(selected.alt_index).toBe(altIndex)
  expect(selected.ref).toBeTruthy()
  expect(selected.alt).toBeTruthy()
  await expect(page.getByRole('heading', { name: `ALT ${altIndex} exact detail` })).toBeVisible()
  const selectedScrollTop = await indexScroller.evaluate((element) => element.scrollTop)
  expect(Math.abs(selectedScrollTop - clickedScrollTop)).toBeLessThanOrEqual(1)
  expect(await page.evaluate(() => (window as any).__lrTrDocumentMarker)).toBe(documentMarker)
  expect(
    await page
      .getByTestId('lr-tr-exact-allele-browser')
      .evaluate((element) => (element as any).__lrTrBrowserSentinel)
  ).toBe(browserSentinel)
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
    beforeSelection.navigationCount
  )
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - beforeSelection.scrollY)
  ).toBeLessThanOrEqual(1)
  expect(selectionRequests).toHaveLength(1)
  page.off('request', recordSelectionRequest)
  await page.unroute('**/api/**', gateSelectedDetail)
  await expect(exactLink).toBeFocused()
  await expect(
    page.getByRole('heading', {
      name: new RegExp(`^[0-9,]+ of ${exactAlleleCount.toLocaleString()} exact ALTs at`),
    })
  ).toBeVisible()

  return selected.variant_id as string
}

const attachLocatorScreenshot = async (locator: any, testInfo: TestInfo, name: string) => {
  const screenshotPath = process.env.TR_SCREENSHOT_DIR
    ? `${process.env.TR_SCREENSHOT_DIR}/${name}`
    : undefined
  await testInfo.attach(name, {
    body: await locator.screenshot({ animations: 'disabled', path: screenshotPath }),
    contentType: 'image/png',
  })
}

const attachAlleleBrowserScreenshot = (page: Page, testInfo: TestInfo, name: string) =>
  attachLocatorScreenshot(page.getByTestId('lr-tr-exact-allele-browser'), testInfo, name)

const purityPointMetrics = (plot: any) =>
  plot.locator('[data-called-alleles]').evaluateAll((points: HTMLElement[]) =>
    points.map((point) => ({
      ac: Number(point.dataset.calledAlleles),
      diameter: Number(point.dataset.pointDiameter),
      renderedWidth: point.getBoundingClientRect().width,
      selected: point.getAttribute('aria-current') === 'true',
      boxSizing: getComputedStyle(point).boxSizing,
    }))
  )

const expectHistorySelection = async (
  page: Page,
  direction: 'back' | 'forward',
  alleleId: string
) => {
  const before = await page.evaluate(() => ({
    navigationCount: performance.getEntriesByType('navigation').length,
    scrollY: window.scrollY,
  }))
  const indexScroller = page.locator('.lr-tr-exact-index-scroll')
  const listScrollTop = await indexScroller.evaluate((element) => element.scrollTop)
  const responsePromise = waitForLocusResponse(page)
  if (direction === 'back') await page.goBack()
  else await page.goForward()
  await responsePromise
  await expect.poll(() => new URL(page.url()).searchParams.get('allele')).toBe(alleleId)
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
    before.navigationCount
  )
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - before.scrollY)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs((await indexScroller.evaluate((element) => element.scrollTop)) - listScrollTop)
  ).toBeLessThanOrEqual(1)
}

const verifyLegacyRedirect = async (page: Page, locusId: string, alleleId: string) => {
  await page.goto('/about')
  const redirectResponse = page.waitForResponse((response) =>
    isGraphqlOperation(response, 'LegacyLongReadTrRedirect')
  )
  const locusResponse = waitForLocusResponse(page)
  await page.goto(`/variant/${alleleId}?${datasetQuery('hgsvc_hprc')}&keep=1`)
  expect((await redirectResponse).status()).toBe(200)
  expect((await locusResponse).status()).toBe(200)
  await expect
    .poll(() => {
      const url = new URL(page.url())
      return {
        pathname: decodeURIComponent(url.pathname),
        dataset: url.searchParams.get('dataset'),
        cohort: url.searchParams.get('lr_cohort'),
        keep: url.searchParams.get('keep'),
        allele: url.searchParams.get('allele'),
      }
    })
    .toEqual({
      pathname: `/tandem-repeat/${locusId}`,
      dataset: 'gnomad_r4_lr',
      cohort: 'hgsvc_hprc',
      keep: '1',
      allele: alleleId,
    })
  await page.goBack()
  await expect(page).toHaveURL(/\/about$/)
}

test.describe('Long-read tandem-repeat locus exact navigation', () => {
  test('canonical selection, history, and legacy redirects stay in place for HTT', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const runtimeErrors: Error[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error))

    await openLocus(page, COMPOUND_LOCUS, 72)
    const compoundAlt1 = await selectExactAllele(
      page,
      COMPOUND_LOCUS,
      1,
      72,
      'hgsvc_hprc',
      'keyboard'
    )
    const compoundAlt2 = await selectExactAllele(page, COMPOUND_LOCUS, 2, 72)
    expect(compoundAlt1).toBe('chr4-3074876-TRV-164~1')
    expect(compoundAlt2).toBe('chr4-3074876-TRV-164~2')
    await expectHistorySelection(page, 'back', compoundAlt1)
    await expectHistorySelection(page, 'forward', compoundAlt2)
    await verifyLegacyRedirect(page, COMPOUND_LOCUS, compoundAlt2)

    expect(runtimeErrors).toEqual([])
  })

  test('HTT keeps all 72 HGSVC and 497 AoU ALTs reachable above in-place detail', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000)

    const httIndex = await openLocus(page, COMPOUND_LOCUS, 72)
    const emptyDetail = page.getByText('Select an exact ALT to view its sequence and details.')
    const indexTable = httIndex.getByRole('table', { name: 'Exact alternate allele index' })
    const wideIndexBox = await indexTable.boundingBox()
    const wideDetailBox = await emptyDetail.boundingBox()
    expect(wideIndexBox).not.toBeNull()
    expect(wideDetailBox).not.toBeNull()
    expect(wideDetailBox!.y).toBeGreaterThan(wideIndexBox!.y + wideIndexBox!.height - 2)

    const indexMetrics = await indexTable.evaluate((table) => {
      const scroller = table.querySelector<HTMLElement>('.lr-tr-exact-index-scroll')!
      const scrollerBox = scroller.getBoundingClientRect()
      const visibleRows = Array.from(scroller.querySelectorAll<HTMLElement>('[role="row"]')).filter(
        (row) => {
          const box = row.getBoundingClientRect()
          return box.bottom > scrollerBox.top && box.top < scrollerBox.bottom
        }
      ).length
      return {
        clientWidth: table.clientWidth,
        scrollWidth: table.scrollWidth,
        scrollerHeight: scroller.clientHeight,
        visibleRows,
      }
    })
    expect(indexMetrics.scrollWidth).toBeLessThanOrEqual(indexMetrics.clientWidth)
    expect(indexMetrics.scrollerHeight).toBe(616)
    expect(indexMetrics.visibleRows).toBeGreaterThanOrEqual(14)

    const headerCells = indexTable.locator(
      '[role="row"][aria-rowindex="1"] > [role="columnheader"]'
    )
    const firstRowCells = indexTable.locator('[role="row"][aria-rowindex="2"] > [role="cell"]')
    const columnBoxes = await Promise.all(
      Array.from({ length: 6 }, async (_, column) => ({
        header: await headerCells.nth(column).boundingBox(),
        cell: await firstRowCells.nth(column).boundingBox(),
      }))
    )
    columnBoxes.forEach(({ header, cell }) => {
      expect(header).not.toBeNull()
      expect(cell).not.toBeNull()
      expect(Math.abs(header!.x - cell!.x)).toBeLessThanOrEqual(1)
      expect(header!.x + header!.width).toBeLessThanOrEqual(
        wideIndexBox!.x + wideIndexBox!.width + 1
      )
    })
    await expect(
      indexTable.getByRole('img', { name: 'ALT 1 motif structure preview' })
    ).toBeVisible()
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-all-exact-alts-wide.png')
    const httPurityPlot = page.getByRole('group', {
      name: /exact alleles plotted by whole-record length difference and source purity/,
    })
    const httPointMetrics = await purityPointMetrics(httPurityPlot)
    const httAcs = httPointMetrics.map(({ ac }: any) => ac)
    expect(Math.max(...httAcs)).toBeGreaterThan(Math.min(...httAcs))
    expect(Math.max(...httPointMetrics.map(({ diameter }: any) => diameter))).toBeGreaterThan(
      Math.min(...httPointMetrics.map(({ diameter }: any) => diameter)) * 2
    )
    await testInfo.attach('htt-purity-ac-range.json', {
      body: JSON.stringify({ minimum: Math.min(...httAcs), maximum: Math.max(...httAcs) }),
      contentType: 'application/json',
    })
    await attachLocatorScreenshot(
      httPurityPlot.locator('xpath=..'),
      testInfo,
      'htt-purity-ac-scale-wide.png'
    )

    const httAlt72 = await selectExactAllele(page, COMPOUND_LOCUS, 72, 72)
    expect(httAlt72).toMatch(/~72$/)
    await expect(page.getByText(/ALT 72 of 72/)).toBeVisible()
    const selectedPurityPoint = httPurityPlot.locator('[data-called-alleles][aria-current="true"]')
    if ((await selectedPurityPoint.count()) > 0) {
      const selectedMetric = await selectedPurityPoint.evaluate((point: HTMLElement) => ({
        diameter: Number(point.dataset.pointDiameter),
        renderedWidth: point.getBoundingClientRect().width,
        boxSizing: getComputedStyle(point).boxSizing,
      }))
      expect(selectedMetric.boxSizing).toBe('border-box')
      expect(Math.abs(selectedMetric.renderedWidth - selectedMetric.diameter)).toBeLessThanOrEqual(
        1
      )
    }
    const wideMotifGrid = page.getByLabel('Selected ALT motif structure grid')
    await expect(wideMotifGrid).toBeVisible()
    const wideMotifMetrics = await wideMotifGrid.evaluate((grid) => ({
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
    }))
    expect(wideMotifMetrics.scrollWidth).toBeLessThanOrEqual(wideMotifMetrics.clientWidth)
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-selected-detail-wide.png')

    await page.setViewportSize({ width: 760, height: 900 })
    const narrowIndexBox = await httIndex
      .getByRole('table', { name: 'Exact alternate allele index' })
      .boundingBox()
    const narrowDetailBox = await page.getByTestId('lr-tr-selected-detail').boundingBox()
    expect(narrowIndexBox).not.toBeNull()
    expect(narrowDetailBox).not.toBeNull()
    expect(narrowDetailBox!.y).toBeGreaterThan(narrowIndexBox!.y + narrowIndexBox!.height - 2)
    expect(await indexTable.evaluate((table) => table.scrollWidth)).toBeLessThanOrEqual(
      await indexTable.evaluate((table) => table.clientWidth)
    )
    expect(await wideMotifGrid.evaluate((grid) => grid.scrollWidth)).toBeLessThanOrEqual(
      await wideMotifGrid.evaluate((grid) => grid.clientWidth)
    )
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-selected-detail-narrow.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(indexTable.getByRole('columnheader', { name: 'Purity' })).toBeHidden()
    await expect(indexTable.getByRole('columnheader', { name: 'AC', exact: true })).toBeHidden()
    await expect(
      indexTable.getByRole('row', {
        name: /ALT 72; Δ length .+; purity .+; AC .+; AF .+/,
      })
    ).toBeVisible()
    expect(await indexTable.evaluate((table) => table.scrollWidth)).toBeLessThanOrEqual(
      await indexTable.evaluate((table) => table.clientWidth)
    )

    await page.setViewportSize({ width: 1280, height: 720 })
    await openLocus(page, COMPOUND_LOCUS, 497, 'aou')
    const aouAlt497 = await selectExactAllele(page, COMPOUND_LOCUS, 497, 497, 'aou')
    expect(aouAlt497).toMatch(/~497$/)
    await expect(page.getByText(/ALT 497 of 497/)).toBeVisible()
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-497-aou-selected-detail-wide.png')

    await openLocus(page, SPARSE_LOCUS, 9)
    const sparsePurityPlot = page.getByRole('group', {
      name: /exact alleles plotted by whole-record length difference and source purity/,
    })
    const sparseMetrics = await purityPointMetrics(sparsePurityPlot)
    const sparseAcs = sparseMetrics.map(({ ac }: any) => ac)
    expect(sparseAcs.length).toBeGreaterThan(0)
    if (new Set(sparseAcs).size > 1) {
      expect(new Set(sparseMetrics.map(({ diameter }: any) => diameter)).size).toBeGreaterThan(1)
    }
    await testInfo.attach('sparse-chr1-purity-ac-range.json', {
      body: JSON.stringify({ minimum: Math.min(...sparseAcs), maximum: Math.max(...sparseAcs) }),
      contentType: 'application/json',
    })
    await attachLocatorScreenshot(
      sparsePurityPlot.locator('xpath=..'),
      testInfo,
      'sparse-chr1-purity-ac-scale-wide.png'
    )
  })
})
