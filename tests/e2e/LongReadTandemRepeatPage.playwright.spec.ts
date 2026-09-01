import { expect, test, type Page, type TestInfo } from '@playwright/test'

const COMPOUND_LOCUS =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'
const SIMPLE_THREE_ALT_LOCUS = '1-143278475-143278486-T'
const SPARSE_LOCUS = '1-121606499-121606508-AG+1-121606517-121606536-A'
const ARX_1_LOCUS = 'X-25013649-25013697-NGC'
const ATXN1_LOCUS = '6-16327633-16327723-TGC'
const RFC1_LOCUS = '4-39348424-39348479-AAAAG'
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
    name: `${exactAlleleCount} exact ALT ${exactAlleleCount === 1 ? 'sequence' : 'sequences'}`,
  })
  return { heading, index: page.getByTestId('lr-tr-exact-allele-browser').locator('..') }
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
  await expect(index.getByRole('table', { name: 'Exact-ALT index' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Exact-ALT index' })).toHaveCount(1)
  await expect(page.getByRole('table', { name: /Exact ALTs at/ })).toHaveCount(0)
  await expect(index.locator('details')).toHaveCount(0)
  await expect(index.getByRole('table', { name: 'Exact-ALT index' })).toHaveAttribute(
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
  const requestedScrollTop = altIndex > 10 ? (altIndex - 1) * 52 : 0
  const indexScrollTop = await indexScroller.evaluate((element, top) => {
    element.scrollTo({ top })
    return element.scrollTop
  }, requestedScrollTop)
  if (requestedScrollTop > 0) expect(indexScrollTop).toBeGreaterThan(0)

  const exactRow = index.locator(`[role="row"][title$="~${altIndex}"]`)
  const exactLink = exactRow.getByRole('link', {
    name: new RegExp(`^(Select|Selected) ALT ${altIndex}$`),
  })
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
  await expect(exactLink).not.toHaveAttribute('aria-current', 'true')
  await expect(
    page.getByRole('status').filter({
      hasText: 'retain their loaded cohort and allele identity and are temporarily inert',
    })
  ).toBeVisible()
  await expect(page.locator('[data-revalidating="true"]')).toHaveAttribute('inert', '')
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
  await expect(
    page.getByRole('heading', { name: `${selected.variant_id} exact ALT details` })
  ).toBeVisible()
  await expect(exactLink).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('[data-revalidating="true"]')).toHaveCount(0)
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
      name: `${exactAlleleCount.toLocaleString()} exact ALT ${
        exactAlleleCount === 1 ? 'sequence' : 'sequences'
      }`,
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

const expectNarrowControlsContained = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  )
  const bounds = await page.locator('label:visible, select:visible').evaluateAll((controls) =>
    controls.map((control) => {
      const box = control.getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width, viewport: window.innerWidth }
    })
  )
  bounds.forEach((box) => {
    expect(box.width).toBeGreaterThan(0)
    expect(box.left).toBeGreaterThanOrEqual(-1)
    expect(box.right).toBeLessThanOrEqual(box.viewport + 1)
  })
}

const purityPointMetrics = (plot: any) =>
  plot.locator('[data-called-alleles]').evaluateAll((points: HTMLElement[]) =>
    points.map((point) => ({
      ac: Number(point.dataset.calledAlleles),
      diameter: Number(point.dataset.pointDiameter),
      targetWidth: point.getBoundingClientRect().width,
      visualWidth: point.querySelector('span')!.getBoundingClientRect().width,
      selected: point.dataset.selectedAllele === 'true',
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
  test('ARX_1 switches from All of Us to HGSVC/HPRC without an ancillary error', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await openLocus(page, ARX_1_LOCUS, 73, 'aou')
    await expect(page.getByRole('heading', { name: 'ARX_1 (ARX) NGC tandem repeat' })).toBeVisible()
    await expect(page.getByText('39–73 bp (−9 to +25 bp)')).toBeVisible()
    await expect(page.getByText('ARX — coding: polyalanine')).toBeVisible()

    const responsePromise = waitForLocusResponse(page)
    await page.getByLabel('Long-read cohort').selectOption('hgsvc_hprc')
    const response = await responsePromise
    const payload = await response.json()
    expect(response.status()).toBe(200)
    expect(payload.errors).toBeUndefined()
    expect(payload.data.long_read_tandem_repeat_locus.id).toBe(ARX_1_LOCUS)
    await expect(page.getByRole('heading', { name: '2 exact ALT sequences' })).toBeVisible()
    await expect(page.getByText('Unable to load tandem-repeat locus')).toHaveCount(0)

    const componentDisclosure = page.locator('details').filter({
      hasText: 'LR source representation and provenance — 1 ordered component',
    })
    await expect(componentDisclosure).not.toHaveAttribute('open', '')
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('heading', { name: 'ARX_1 (ARX) NGC tandem repeat' })).toBeVisible()
    await expectNarrowControlsContained(page)
    const helpTrigger = page.getByRole('button', { name: 'About the allelic landscape' })
    await helpTrigger.focus()
    await helpTrigger.click()
    const help = page.getByRole('dialog', { name: 'About the allelic landscape' })
    await expect(help.getByText('Repeat-count distributions (simple loci only)')).toBeVisible()
    await expect(help.getByText('Total allele length change (ALT − REF, bp)')).toBeVisible()
    await expect(help.getByText('Length change × motif purity')).toBeVisible()
    await expect(help.getByText('Genotype length distribution')).toBeVisible()
    await expect(help.getByText(/These marks are read-only/)).toBeVisible()
    await expect(help.getByText(/Only index row selection changes the URL/)).toBeVisible()
    await expect(help.getByText(/Purity is source-reported/)).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(helpTrigger).toBeFocused()
  })

  test('three-ALT simple locus renders complete matching motif previews and exact sequence', async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000)
    const index = await openLocus(page, SIMPLE_THREE_ALT_LOCUS, 3)
    const indexTable = index.getByRole('table', { name: 'Exact-ALT index' })
    await expect(indexTable.getByRole('img', { name: /motif structure preview/ })).toHaveCount(3)
    await expect(page.getByText(/Motif previews are unavailable/)).toHaveCount(0)
    const simpleLandscape = page.getByTestId('whole-record-allele-plot-grid')
    await expect(simpleLandscape).toHaveAttribute('data-plot-count', '4')
    await expect(page.getByRole('heading', { name: 'Simple-locus repeat counts' })).toHaveCount(0)
    expect(await simpleLandscape.locator('rect[fill="#9c27b0"]').count()).toBeGreaterThan(0)
    const simpleLandscapeCards = await simpleLandscape.locator(':scope > [data-plot-card]').all()
    expect(simpleLandscapeCards).toHaveLength(4)
    const simpleCardBoxes = await Promise.all(
      simpleLandscapeCards.map((card) => card.boundingBox())
    )
    simpleCardBoxes.forEach((box) => expect(box).not.toBeNull())
    expect(Math.abs(simpleCardBoxes[0]!.y - simpleCardBoxes[1]!.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(simpleCardBoxes[2]!.y - simpleCardBoxes[3]!.y)).toBeLessThanOrEqual(2)
    expect(
      simpleCardBoxes[1]!.x - (simpleCardBoxes[0]!.x + simpleCardBoxes[0]!.width)
    ).toBeGreaterThanOrEqual(24)
    expect(
      simpleCardBoxes[2]!.y - (simpleCardBoxes[0]!.y + simpleCardBoxes[0]!.height)
    ).toBeGreaterThanOrEqual(24)
    const wideGap = await simpleLandscape.evaluate((grid) => {
      const style = getComputedStyle(grid)
      return { column: Number.parseFloat(style.columnGap), row: Number.parseFloat(style.rowGap) }
    })
    expect(wideGap.column).toBeGreaterThanOrEqual(24)
    expect(wideGap.column).toBeLessThanOrEqual(32)
    expect(wideGap.row).toBeGreaterThanOrEqual(24)
    expect(wideGap.row).toBeLessThanOrEqual(32)
    await attachLocatorScreenshot(
      simpleLandscape,
      testInfo,
      'simple-allelic-landscape-four-panel-wide.png'
    )

    await page.setViewportSize({ width: 390, height: 844 })
    const narrowSimpleBoxes = await Promise.all(
      simpleLandscapeCards.map((card) => card.boundingBox())
    )
    narrowSimpleBoxes.forEach((box) => expect(box).not.toBeNull())
    for (let cardIndex = 1; cardIndex < narrowSimpleBoxes.length; cardIndex += 1) {
      expect(narrowSimpleBoxes[cardIndex]!.y).toBeGreaterThan(
        narrowSimpleBoxes[cardIndex - 1]!.y + narrowSimpleBoxes[cardIndex - 1]!.height + 20
      )
    }
    expect(narrowSimpleBoxes[0]!.width).toBeGreaterThan(280)
    await expectNarrowControlsContained(page)
    await attachLocatorScreenshot(
      simpleLandscape,
      testInfo,
      'simple-allelic-landscape-four-panel-narrow.png'
    )
    await page.setViewportSize({ width: 1280, height: 720 })

    await expect(page.getByRole('img', { name: /ordered LR reference components/ })).toHaveCount(0)
    const previewColors = await indexTable
      .getByRole('img', { name: /ALT \d+ motif structure preview/ })
      .evaluateAll((previews) =>
        previews.map((preview) => preview.querySelector('rect')?.getAttribute('fill'))
      )
    expect(previewColors).toHaveLength(3)
    expect(new Set(previewColors).size).toBe(1)

    const selected = await selectExactAllele(page, SIMPLE_THREE_ALT_LOCUS, 1, 3)
    expect(selected).toBe('chr1-143278475-TRV-11~1')
    await expect(page.getByTestId('motif-highlighted-sequence-text')).toHaveText('ATTTTTTTTTT')
    await expect(page.getByLabel('Shared VCF anchor, 1 bp')).toHaveText('A')
    await expect(page.getByLabel('Show all allele sequences')).toHaveCount(0)
    await attachAlleleBrowserScreenshot(page, testInfo, 'simple-three-alt-motif-previews.png')
  })

  test('HTT, ATXN1, and RFC1 expose exact catalog identity without changing measurements', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const cases = [
      {
        locus: COMPOUND_LOCUS,
        title: 'HTT CAG tandem repeat',
        motif: 'CAG',
        role: null,
        components: 6,
      },
      {
        locus: ATXN1_LOCUS,
        title: 'ATXN1 TGC tandem repeat',
        motif: 'TGC',
        role: null,
        components: 1,
      },
      {
        locus: RFC1_LOCUS,
        title: 'RFC1 AAAAG tandem repeat',
        motif: 'AAAAG',
        role: 'benign reference motif',
        components: 1,
      },
    ]

    const verifyIdentity = async (item: (typeof cases)[number]) => {
      const responsePromise = waitForLocusResponse(page)
      await page.goto(`/tandem-repeat/${item.locus}?${datasetQuery('hgsvc_hprc')}`)
      const response = await responsePromise
      const payload = await response.json()
      expect(response.status()).toBe(200)
      expect(payload.errors).toBeUndefined()
      expect(payload.data.long_read_tandem_repeat_locus.primary_repeat).toMatchObject({
        status: 'AVAILABLE',
        reason_code: null,
        motif: item.motif,
        component_index: 0,
        selection_basis: 'EXACT_MAIN_CATALOG_COMPONENT',
        biological_role: item.role,
        registry_digest: null,
      })
      await expect(page.getByRole('heading', { name: item.title })).toBeVisible()
      if (item.role) {
        await expect(page.getByLabel(`Primary repeat ${item.motif}`)).toContainText(item.role)
      }
      await expect(
        page.getByText(
          `LR source representation and provenance — ${item.components} ordered ${
            item.components === 1 ? 'component' : 'components'
          }`
        )
      ).toBeVisible()
      await expect(page.getByRole('heading', { name: /Long-read exact .* units/ })).toHaveCount(0)
    }

    await verifyIdentity(cases[0])
    await verifyIdentity(cases[1])
    await verifyIdentity(cases[2])
    await expect(page.getByText('AAGGG', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('pathogenic', { exact: true }).first()).toBeVisible()
  })

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
    await expect(page.getByRole('heading', { name: 'HTT CAG tandem repeat' })).toBeVisible()
    await expect(page.getByLabel('Primary repeat CAG')).toContainText(
      'exact catalog / LR component 1'
    )
    const sourceDisclosure = page
      .getByText('LR source representation and provenance — 6 ordered components')
      .locator('..')
    await expect(sourceDisclosure).not.toHaveAttribute('open', '')
    await sourceDisclosure.locator(':scope > summary').focus()
    await sourceDisclosure.locator(':scope > summary').press('Enter')
    await expect(sourceDisclosure).toHaveAttribute('open', '')
    await expect(
      sourceDisclosure.getByRole('img', { name: /6 ordered LR reference components/ })
    ).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expectNarrowControlsContained(page)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    await page.setViewportSize({ width: 1280, height: 720 })
    const emptyDetail = page.getByText(
      'No exact ALT selected. Choose Select in a row to view its sequence and details.'
    )
    const indexTable = httIndex.getByRole('table', { name: 'Exact-ALT index' })
    const wideIndexBox = await indexTable.boundingBox()
    const wideDetailBox = await emptyDetail.boundingBox()
    expect(wideIndexBox).not.toBeNull()
    expect(wideDetailBox).not.toBeNull()
    expect(wideDetailBox!.height).toBeLessThanOrEqual(72)
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
    expect(indexMetrics.scrollerHeight).toBe(312)
    expect(indexMetrics.visibleRows).toBeGreaterThanOrEqual(6)

    const acSort = indexTable.getByRole('button', { name: 'AC', exact: true })
    await acSort.click()
    await expect(acSort.locator('..')).toHaveAttribute('aria-sort', 'descending')
    const renderedAcs = await indexTable
      .locator('[role="row"][aria-rowindex]:not([aria-rowindex="1"])')
      .evaluateAll((rows) =>
        rows.map((row) => Number(row.querySelectorAll('[role="cell"]')[4].textContent))
      )
    expect(renderedAcs).toEqual([...renderedAcs].sort((left, right) => right - left))
    await indexTable.getByRole('button', { name: 'Exact ALT' }).click()

    const headerCells = indexTable.locator(
      '[role="row"][aria-rowindex="1"] > [role="columnheader"]'
    )
    const firstRowCells = indexTable.locator('[role="row"][aria-rowindex="2"] > [role="cell"]')
    const columnBoxes = await Promise.all(
      Array.from({ length: 7 }, async (_, column) => ({
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
    const compactPreview = indexTable.getByRole('img', {
      name: 'ALT 1 motif structure preview',
    })
    await expect(compactPreview).toBeVisible()
    const compactBoundary = await compactPreview
      .locator('[data-motif-unit]')
      .first()
      .evaluate((unit) => ({
        fill: unit.getAttribute('fill'),
        stroke: getComputedStyle(unit).stroke,
        strokeWidth: getComputedStyle(unit).strokeWidth,
        vectorEffect: getComputedStyle(unit).getPropertyValue('vector-effect'),
      }))
    expect(compactBoundary.fill).toBeTruthy()
    expect(compactBoundary.stroke).toBe('rgb(54, 69, 79)')
    expect(compactBoundary.strokeWidth).toBe('1px')
    expect(compactBoundary.vectorEffect).toBe('non-scaling-stroke')
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-all-exact-alts-wide.png')

    const wholeRecordPlots = page.getByTestId('whole-record-allele-plot-grid')
    const histogramCard = page
      .getByRole('heading', { level: 3, name: 'Total allele length change' })
      .locator('..')
    const purityCard = page
      .getByRole('heading', { level: 3, name: 'Length change × motif purity' })
      .locator('..')
    const genotypeCard = page.getByTestId('genotype-length-card')
    const genotypeDetail = page.getByTestId('genotype-pair-detail')
    const wideCards = await Promise.all([
      histogramCard.boundingBox(),
      purityCard.boundingBox(),
      genotypeCard.boundingBox(),
    ])
    wideCards.forEach((box) => expect(box).not.toBeNull())
    expect(
      Math.max(...wideCards.map((box) => box!.y)) - Math.min(...wideCards.map((box) => box!.y))
    ).toBeLessThanOrEqual(2)
    const genotypeFigure = genotypeCard.getByRole('region', {
      name: 'Genotype length distribution plot',
    })
    const genotypeSvg = genotypeFigure.getByRole('group', {
      name: 'Genotype distribution by total allele length change',
    })
    const [wideGenotypeCardBox, wideGenotypeSvgBox] = await Promise.all([
      genotypeCard.boundingBox(),
      genotypeSvg.boundingBox(),
    ])
    expect(wideGenotypeCardBox).not.toBeNull()
    expect(wideGenotypeSvgBox).not.toBeNull()
    expect(wideGenotypeSvgBox!.x + wideGenotypeSvgBox!.width).toBeLessThanOrEqual(
      wideGenotypeCardBox!.x + wideGenotypeCardBox!.width + 1
    )
    expect(await genotypeFigure.evaluate((figure) => figure.scrollWidth)).toBeLessThanOrEqual(
      await genotypeFigure.evaluate((figure) => figure.clientWidth)
    )
    const wideGenotypeDetailBox = await genotypeDetail.boundingBox()
    expect(wideGenotypeDetailBox).not.toBeNull()
    expect(wideGenotypeDetailBox!.y).toBeGreaterThan(
      Math.max(...wideCards.map((box) => box!.y + box!.height)) - 2
    )
    await expect(wholeRecordPlots).toHaveAttribute('data-plot-count', '3')
    const compoundPlotCards = wholeRecordPlots.locator(':scope > [data-plot-card]')
    await expect(compoundPlotCards).toHaveCount(3)
    const compoundGap = await wholeRecordPlots.evaluate((grid) => {
      const style = getComputedStyle(grid)
      return { column: Number.parseFloat(style.columnGap), row: Number.parseFloat(style.rowGap) }
    })
    expect(compoundGap.column).toBeGreaterThanOrEqual(24)
    expect(compoundGap.column).toBeLessThanOrEqual(32)
    expect(compoundGap.row).toBeGreaterThanOrEqual(24)
    expect(compoundGap.row).toBeLessThanOrEqual(32)
    const sharedFilters = page.getByRole('group', {
      name: 'Shared ancestry and sex filters for total-length plots',
    })
    const alleleDisplay = page.getByRole('group', {
      name: 'Total-length histogram display controls',
    })
    await expect(sharedFilters.getByText('Filter all three total-length plots:')).toBeVisible()
    await expect(alleleDisplay.getByText('Total-length histogram display:')).toBeVisible()
    await expect(genotypeCard.getByLabel('Color by')).toHaveCount(0)
    await expect(genotypeCard.getByLabel('y-Scale')).toHaveCount(0)
    await attachLocatorScreenshot(
      wholeRecordPlots,
      testInfo,
      'allelic-landscape-three-panel-wide.png'
    )
    const selectableGenotypeCell = genotypeCard
      .locator('[role="button"][aria-label*="filter the exact-ALT index to this square"]')
      .first()
    const genotypeTargetBox = await selectableGenotypeCell.boundingBox()
    expect(genotypeTargetBox).not.toBeNull()
    expect(genotypeTargetBox!.width).toBeGreaterThanOrEqual(24)
    expect(genotypeTargetBox!.height).toBeGreaterThanOrEqual(24)
    await selectableGenotypeCell.click()
    await expect(
      page.getByRole('heading', {
        name: /of 72 exact ALT sequences — selected genotype cell \(.+ bp × .+ bp\)/,
      })
    ).toBeFocused()
    await page.getByRole('button', { name: 'Show all exact ALT sequences' }).click()
    await expect(page.getByRole('heading', { name: '72 exact ALT sequences' })).toBeFocused()

    const histogram = page.getByTestId('whole-record-delta-histogram')
    const histogramButtons = histogram.getByRole('button')
    const purpleBarColors = await histogramButtons.evaluateAll((buttons) =>
      buttons
        .filter((button) => Number(button.getAttribute('data-height-percent')) > 0)
        .map((button) => getComputedStyle(button).backgroundColor)
    )
    expect(new Set(purpleBarColors)).toEqual(new Set(['rgb(156, 39, 176)']))
    const deltaAxis = page.getByTestId('whole-record-delta-axis')
    const signedTicks = await deltaAxis.locator('[data-delta]').evaluateAll((ticks) =>
      ticks.map((tick) => ({
        delta: Number((tick as HTMLElement).dataset.delta),
        text: tick.textContent,
      }))
    )
    expect(signedTicks.some((tick) => tick.delta < 0 && tick.text?.startsWith('−'))).toBe(true)
    expect(signedTicks).toContainEqual({ delta: 0, text: '0' })
    expect(signedTicks.some((tick) => tick.delta > 0 && tick.text?.startsWith('+'))).toBe(true)
    const firstBarCenter = await histogramButtons
      .first()
      .evaluate((bar) => bar.getBoundingClientRect().left + bar.getBoundingClientRect().width / 2)
    const firstTickCenter = await deltaAxis
      .locator('[data-delta]')
      .first()
      .evaluate(
        (tick) => tick.getBoundingClientRect().left + tick.getBoundingClientRect().width / 2
      )
    expect(Math.abs(firstBarCenter - firstTickCenter)).toBeLessThanOrEqual(1)
    await attachLocatorScreenshot(
      wholeRecordPlots,
      testInfo,
      'compound-whole-record-plots-purple.png'
    )

    const histogramLabels = await histogramButtons.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label') || '')
    )
    const multiIdentityBinIndex = histogramLabels.findIndex((label) => {
      const match = label.match(/; ([0-9,]+) exact ALT sequences?;/)
      return match != null && Number(match[1].replace(/,/g, '')) > 1
    })
    expect(multiIdentityBinIndex).toBeGreaterThanOrEqual(0)
    const multiIdentityLabel = histogramLabels[multiIdentityBinIndex]
    const multiIdentityMatch = multiIdentityLabel.match(
      /^([+−]?[0-9]+) bp; .+; ([0-9,]+) exact ALT sequences?;/
    )!
    const filteredDelta = multiIdentityMatch[1]
    const filteredCount = Number(multiIdentityMatch[2].replace(/,/g, ''))
    await histogramButtons.nth(multiIdentityBinIndex).click()
    expect(
      await histogramButtons
        .nth(multiIdentityBinIndex)
        .evaluate((button) => getComputedStyle(button).backgroundColor)
    ).toBe('rgb(233, 120, 28)')
    const filteredNumericDelta = Number(filteredDelta.replace('−', '-').replace('+', ''))
    await expect(deltaAxis.locator(`[data-delta="${filteredNumericDelta}"]`)).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: `${filteredCount.toLocaleString()} of 72 exact ALT sequences at ${filteredDelta} bp`,
      })
    ).toBeFocused()
    await expect(indexTable).toHaveAttribute('aria-rowcount', String(filteredCount + 1))
    await expect(page.getByRole('table', { name: 'Exact-ALT index' })).toHaveCount(1)
    await expect(page.getByRole('table', { name: /Exact ALTs at/ })).toHaveCount(0)
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-filtered-exact-alts-wide.png')
    await page.getByRole('button', { name: 'Show all exact ALT sequences' }).click()
    await expect(page.getByRole('heading', { name: '72 exact ALT sequences' })).toBeFocused()
    await expect(indexTable).toHaveAttribute('aria-rowcount', '73')

    const httPurityPlot = page.getByRole('group', {
      name: /exact ALT sequences plotted by total allele length change and source-reported motif purity/,
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

    const purityFilterPoint = httPurityPlot.getByRole('button').first()
    const filterBefore = {
      ...(await page.evaluate(() => ({
        url: window.location.href,
        historyLength: window.history.length,
        navigationCount: performance.getEntriesByType('navigation').length,
        scrollY: window.scrollY,
      }))),
      indexScrollTop: await indexTable
        .locator('.lr-tr-exact-index-scroll')
        .evaluate((element) => element.scrollTop),
    }
    await purityFilterPoint.click()
    await expect(purityFilterPoint).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByRole('heading', { name: /1 of 72 exact ALT sequences — ALT [0-9]+/ })
    ).toBeFocused()
    await expect(indexTable).toHaveAttribute('aria-rowcount', '2')
    expect(await page.evaluate(() => window.location.href)).toBe(filterBefore.url)
    expect(await page.evaluate(() => window.history.length)).toBe(filterBefore.historyLength)
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
      filterBefore.navigationCount
    )
    expect(
      Math.abs((await page.evaluate(() => window.scrollY)) - filterBefore.scrollY)
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs(
        (await indexTable
          .locator('.lr-tr-exact-index-scroll')
          .evaluate((element) => element.scrollTop)) - filterBefore.indexScrollTop
      )
    ).toBeLessThanOrEqual(1)
    await purityFilterPoint.focus()
    await purityFilterPoint.press('Enter')
    await expect(page.getByRole('heading', { name: '72 exact ALT sequences' })).toBeFocused()

    const httAlt72 = await selectExactAllele(page, COMPOUND_LOCUS, 72, 72)
    expect(httAlt72).toMatch(/~72$/)
    const selectedPurityPoint = httPurityPlot.locator(
      '[data-called-alleles][data-selected-allele="true"]'
    )
    if ((await selectedPurityPoint.count()) > 0) {
      const selectedMetric = await selectedPurityPoint.evaluate((point: HTMLElement) => ({
        diameter: Number(point.dataset.pointDiameter),
        targetWidth: point.getBoundingClientRect().width,
        visualWidth: point.querySelector('span')!.getBoundingClientRect().width,
        boxSizing: getComputedStyle(point).boxSizing,
      }))
      expect(selectedMetric.boxSizing).toBe('border-box')
      expect(selectedMetric.targetWidth).toBeGreaterThanOrEqual(24)
      expect(Math.abs(selectedMetric.visualWidth - selectedMetric.diameter)).toBeLessThanOrEqual(1)
    }
    const wideMotifGrid = page.getByLabel('Selected ALT motif structure grid')
    await expect(wideMotifGrid).toBeVisible()
    await expect(wideMotifGrid.getByText('DP', { exact: true })).toBeHidden()
    await page.getByText('Sequence analysis details', { exact: true }).click()
    await expect(
      page.getByText(/Browser motif analysis used dynamic-programming sequence alignment/)
    ).toBeVisible()
    const selectedBoundary = await wideMotifGrid
      .locator('svg rect[stroke="white"]')
      .first()
      .evaluate((unit) => ({
        fill: unit.getAttribute('fill'),
        stroke: getComputedStyle(unit).stroke,
        strokeWidth: getComputedStyle(unit).strokeWidth,
        vectorEffect: getComputedStyle(unit).getPropertyValue('vector-effect'),
      }))
    expect(selectedBoundary.fill).toBeTruthy()
    expect(selectedBoundary.stroke).toBe('rgb(54, 69, 79)')
    expect(selectedBoundary.strokeWidth).toBe('1px')
    expect(selectedBoundary.vectorEffect).toBe('non-scaling-stroke')
    const wideMotifMetrics = await wideMotifGrid.evaluate((grid) => ({
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
    }))
    expect(wideMotifMetrics.scrollWidth).toBeLessThanOrEqual(wideMotifMetrics.clientWidth)
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-72-selected-detail-wide.png')

    await page.setViewportSize({ width: 760, height: 900 })
    const mediumCards = await Promise.all([
      histogramCard.boundingBox(),
      purityCard.boundingBox(),
      genotypeCard.boundingBox(),
    ])
    mediumCards.forEach((box) => expect(box).not.toBeNull())
    expect(Math.abs(mediumCards[0]!.y - mediumCards[1]!.y)).toBeLessThanOrEqual(2)
    expect(mediumCards[2]!.y).toBeGreaterThan(mediumCards[0]!.y + mediumCards[0]!.height + 20)
    expect(mediumCards[2]!.width).toBeGreaterThan(280)
    await attachLocatorScreenshot(
      wholeRecordPlots,
      testInfo,
      'allelic-landscape-three-panel-medium.png'
    )
    const narrowIndexBox = await httIndex
      .getByRole('table', { name: 'Exact-ALT index' })
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
    const narrowCards = await Promise.all([
      histogramCard.boundingBox(),
      purityCard.boundingBox(),
      genotypeCard.boundingBox(),
    ])
    narrowCards.forEach((box) => expect(box).not.toBeNull())
    expect(narrowCards[1]!.y).toBeGreaterThan(narrowCards[0]!.y + narrowCards[0]!.height + 20)
    expect(narrowCards[2]!.y).toBeGreaterThan(narrowCards[1]!.y + narrowCards[1]!.height + 20)
    expect(narrowCards[2]!.width).toBeGreaterThan(280)
    await expectNarrowControlsContained(page)
    await expect(genotypeFigure).toHaveAttribute('tabindex', '0')
    expect(await genotypeFigure.evaluate((figure) => figure.scrollWidth)).toBeGreaterThan(
      await genotypeFigure.evaluate((figure) => figure.clientWidth)
    )
    await attachLocatorScreenshot(
      wholeRecordPlots,
      testInfo,
      'allelic-landscape-three-panel-narrow.png'
    )
    const histogramScroller = page.getByTestId('whole-record-delta-histogram-scroller')
    const narrowHistogramMetrics = await histogramScroller.evaluate((scroller) => {
      const scrollElement = scroller as HTMLElement
      scrollElement.scrollLeft = scrollElement.scrollWidth
      return {
        clientWidth: scrollElement.clientWidth,
        scrollLeft: scrollElement.scrollLeft,
        scrollWidth: scrollElement.scrollWidth,
      }
    })
    expect(narrowHistogramMetrics.clientWidth).toBeGreaterThan(0)
    expect(narrowHistogramMetrics.scrollWidth).toBeGreaterThanOrEqual(
      narrowHistogramMetrics.clientWidth
    )
    if (narrowHistogramMetrics.scrollWidth > narrowHistogramMetrics.clientWidth) {
      expect(narrowHistogramMetrics.scrollLeft).toBeGreaterThan(0)
    }
    const lastBarCenter = await histogramButtons
      .last()
      .evaluate((bar) => bar.getBoundingClientRect().left + bar.getBoundingClientRect().width / 2)
    const lastTickCenter = await deltaAxis
      .locator('[data-delta]')
      .last()
      .evaluate(
        (tick) => tick.getBoundingClientRect().left + tick.getBoundingClientRect().width / 2
      )
    expect(Math.abs(lastBarCenter - lastTickCenter)).toBeLessThanOrEqual(1)
    await expect(indexTable.getByRole('columnheader', { name: 'Purity' })).toBeHidden()
    await expect(indexTable.getByRole('columnheader', { name: 'AC', exact: true })).toBeHidden()
    const compactAlt72 = indexTable.getByRole('row', {
      name: /ALT 72; .+~72; total allele length change .+; purity .+; AC .+; AF .+/,
    })
    await expect(compactAlt72).toBeVisible()
    await expect(compactAlt72.getByText(/~72$/)).toBeVisible()
    expect(await indexTable.evaluate((table) => table.scrollWidth)).toBeLessThanOrEqual(
      await indexTable.evaluate((table) => table.clientWidth)
    )

    await page.setViewportSize({ width: 1280, height: 720 })
    const aouIndex = await openLocus(page, COMPOUND_LOCUS, 497, 'aou')
    await expect(aouIndex.getByRole('img', { name: 'ALT 1 motif structure preview' })).toBeVisible()
    const aouAlt497 = await selectExactAllele(page, COMPOUND_LOCUS, 497, 497, 'aou')
    expect(aouAlt497).toMatch(/~497$/)
    await attachAlleleBrowserScreenshot(page, testInfo, 'htt-497-aou-selected-detail-wide.png')

    await openLocus(page, SPARSE_LOCUS, 9)
    const sparsePurityPlot = page.getByRole('group', {
      name: /exact ALT sequences plotted by total allele length change and source-reported motif purity/,
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
