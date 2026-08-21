import { expect, test, type Page } from '@playwright/test'

const DATASET_QUERY = 'dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'
const COMPOUND_LOCUS = '1-121606499-121606508-AG+1-121606517-121606536-A'
const ORDINARY_LOCUS = '1-16712-16744-GTG'

const isGraphqlOperation = (response: any, operation: string) => {
  const request = response.request()
  return request.method() === 'POST' && (request.postData() || '').includes(operation)
}

const waitForLocusResponse = (page: Page) =>
  page.waitForResponse((response) => isGraphqlOperation(response, 'LongReadTandemRepeatLocus'))

const openLocus = async (page: Page, locusId: string, exactAlleleCount: number) => {
  const responsePromise = waitForLocusResponse(page)
  await page.goto(`/tandem-repeat/${locusId}?${DATASET_QUERY}`)
  const indexHeading = page.getByRole('heading', {
    name: `Full exact ALT index (${exactAlleleCount})`,
  })
  await expect(indexHeading).toBeVisible({ timeout: 30_000 })
  const index = page.locator('section').filter({ has: indexHeading })
  await expect(index.getByRole('table', { name: 'Exact alternate allele index' })).toBeVisible()
  await expect(index.locator('details')).toHaveCount(0)
  await expect(index.getByRole('table', { name: 'Exact alternate allele index' })).toHaveAttribute(
    'aria-rowcount',
    String(exactAlleleCount + 1)
  )
  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect((await response.json()).errors).toBeUndefined()
}

const selectExactAllele = async (page: Page, locusId: string, altIndex: number) => {
  const index = page.locator('section').filter({
    has: page.getByRole('heading', { name: /^Full exact ALT index/ }),
  })
  const exactLink = index.getByRole('link', { name: `ALT ${altIndex}`, exact: true }).first()
  const href = await exactLink.getAttribute('href')
  const selectedUrl = new URL(href!, 'http://localhost')
  expect(decodeURIComponent(selectedUrl.pathname)).toBe(`/tandem-repeat/${locusId}`)
  expect(selectedUrl.searchParams.get('dataset')).toBe('gnomad_r4_lr')
  expect(selectedUrl.searchParams.get('lr_cohort')).toBe('hgsvc_hprc')
  expect(selectedUrl.searchParams.get('allele')).toMatch(new RegExp(`~${altIndex}$`))

  const documentMarker = await page.evaluate(() => {
    const marker = `lr-tr-${Date.now()}-${Math.random()}`
    ;(window as any).__lrTrDocumentMarker = marker
    return marker
  })
  const indexScroller = index.locator('.lr-tr-exact-index-scroll')
  const indexScrollTop = await indexScroller.evaluate((element) => {
    element.scrollTo({ top: 72 })
    return element.scrollTop
  })
  expect(indexScrollTop).toBeGreaterThan(0)

  const responsePromise = waitForLocusResponse(page)
  await exactLink.click()
  await expect(page.getByRole('heading', { name: /^Allelic landscape$/ })).toBeVisible()
  await expect(index).toBeVisible()
  expect(await page.evaluate(() => (window as any).__lrTrDocumentMarker)).toBe(documentMarker)
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
  expect(await indexScroller.evaluate((element) => element.scrollTop)).toBe(indexScrollTop)
  expect(await page.evaluate(() => (window as any).__lrTrDocumentMarker)).toBe(documentMarker)
  const selectedDetail = page.getByTestId('lr-tr-selected-detail')
  await expect(selectedDetail).toBeFocused()
  await expect(
    selectedDetail.locator('xpath=..').getByRole('table', { name: /^Exact alleles at/ })
  ).toBeVisible()

  return selected.variant_id as string
}

const expectHistorySelection = async (
  page: Page,
  direction: 'back' | 'forward',
  alleleId: string
) => {
  const responsePromise = waitForLocusResponse(page)
  if (direction === 'back') await page.goBack()
  else await page.goForward()
  await responsePromise
  await expect.poll(() => new URL(page.url()).searchParams.get('allele')).toBe(alleleId)
}

const verifyLegacyRedirect = async (page: Page, locusId: string, alleleId: string) => {
  await page.goto('/about')
  const redirectResponse = page.waitForResponse((response) =>
    isGraphqlOperation(response, 'LegacyLongReadTrRedirect')
  )
  const locusResponse = waitForLocusResponse(page)
  await page.goto(`/variant/${alleleId}?${DATASET_QUERY}&keep=1`)
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
  test('canonical selection, history, and legacy redirects work for ordinary and compound loci', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const runtimeErrors: Error[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error))

    await openLocus(page, COMPOUND_LOCUS, 72)
    const compoundAlt1 = await selectExactAllele(page, COMPOUND_LOCUS, 1)
    const compoundAlt2 = await selectExactAllele(page, COMPOUND_LOCUS, 2)
    expect(compoundAlt1).toBe('chr1-121606499-TRV-37~1')
    expect(compoundAlt2).toBe('chr1-121606499-TRV-37~2')
    await expectHistorySelection(page, 'back', compoundAlt1)
    await expectHistorySelection(page, 'forward', compoundAlt2)
    await verifyLegacyRedirect(page, COMPOUND_LOCUS, compoundAlt2)

    await openLocus(page, ORDINARY_LOCUS, 497)
    await selectExactAllele(page, ORDINARY_LOCUS, 1)
    await selectExactAllele(page, ORDINARY_LOCUS, 2)

    expect(runtimeErrors).toEqual([])
  })
})
