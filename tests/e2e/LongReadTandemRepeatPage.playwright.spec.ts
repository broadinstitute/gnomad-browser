import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const DATASET_QUERY = 'dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc'
const COMPOUND_LOCUS = '1-121606499-121606508-AG+1-121606517-121606536-A'
const ORDINARY_LOCUS = '1-16712-16744-GTG'

const isGraphqlOperation = (response: any, operation: string) => {
  const request = response.request()
  return request.method() === 'POST' && (request.postData() || '').includes(operation)
}

const openLocus = async (page: Page, locusId: string) => {
  const responsePromise = page.waitForResponse((response) =>
    isGraphqlOperation(response, 'LongReadTandemRepeatLocus')
  )
  await page.goto(`/tandem-repeat/${locusId}?${DATASET_QUERY}`)
  await expect(page.locator('[data-testid="lr-tr-allele-table"]')).toBeVisible({ timeout: 30_000 })
  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect((await response.json()).errors).toBeUndefined()
}

const followExactHref = async (
  context: BrowserContext,
  locusPage: Page,
  locusId: string,
  altIndex: number
) => {
  const exactLink = locusPage.getByRole('link', { name: 'View allele' }).nth(altIndex - 1)
  const href = await exactLink.getAttribute('href')
  expect(href).toMatch(
    new RegExp(`^/variant/chr1-[^?]+~${altIndex}\\?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc$`)
  )
  const canonicalId = decodeURIComponent(href!.match(/^\/variant\/([^?]+)/)![1])

  const variantPage = await context.newPage()
  const runtimeErrors: Error[] = []
  variantPage.on('pageerror', (error) => runtimeErrors.push(error))
  const responsePromise = variantPage.waitForResponse(
    (response) =>
      isGraphqlOperation(response, 'GnomadVariant') &&
      (response.request().postData() || '').includes(canonicalId)
  )
  await variantPage.goto(href!)
  await expect(variantPage.getByRole('heading', { name: 'Long-Read Variant Details' })).toBeVisible(
    { timeout: 30_000 }
  )

  const response = await responsePromise
  const responseBody = await response.json()
  expect(response.status()).toBe(200)
  expect(responseBody.errors).toBeUndefined()
  expect(responseBody.data.variant.variant_id).toBe(canonicalId)
  expect(responseBody.data.variant.ref).toBeTruthy()
  expect(responseBody.data.variant.alt).toBeTruthy()
  expect(responseBody.data.variant.long_read_details.source_variant_id).toBeTruthy()
  expect(responseBody.data.variant.long_read_details.alt_index).toBe(altIndex)
  expect(runtimeErrors).toEqual([])

  const parentLink = variantPage.getByRole('link', {
    name: `View locus with ALT ${altIndex} selected`,
  })
  const parentHref = await parentLink.getAttribute('href')
  expect(decodeURIComponent(new URL(parentHref!, 'http://localhost').pathname)).toBe(
    `/tandem-repeat/${locusId}`
  )
  expect(new URL(parentHref!, 'http://localhost').searchParams.get('allele')).toBe(canonicalId)
  await variantPage.close()

  return href
}

test.describe('Long-read tandem-repeat locus exact navigation', () => {
  test('ordinary and compound locus allele links resolve ALT 1 and ALT 2', async ({ browser }) => {
    test.setTimeout(120_000)
    const context = await browser.newContext()
    const locusPage = await context.newPage()

    await openLocus(locusPage, COMPOUND_LOCUS)
    const compoundHrefs = await Promise.all(
      [1, 2].map((altIndex) => followExactHref(context, locusPage, COMPOUND_LOCUS, altIndex))
    )
    expect(compoundHrefs).toEqual([
      `/variant/chr1-121606499-TRV-37~1?${DATASET_QUERY}`,
      `/variant/chr1-121606499-TRV-37~2?${DATASET_QUERY}`,
    ])

    await openLocus(locusPage, ORDINARY_LOCUS)
    await followExactHref(context, locusPage, ORDINARY_LOCUS, 1)
    await followExactHref(context, locusPage, ORDINARY_LOCUS, 2)

    await context.close()
  })
})
