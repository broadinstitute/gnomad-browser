import { test, expect, type Page } from '@playwright/test'

import {
  collectApiMetrics,
  collectLrRequestCounts,
  reportApiMetrics,
  type ApiMetric,
} from './helpers/lrMetrics'
import {
  captureLrGeometry,
  documentToken,
  expectControlWithinViewport,
  expectNoHorizontalOverflow,
  expectStableGeometry,
  installWorkerReadyGate,
  waitForHeldWorkerMessage,
  workerMessageCount,
  workerGateHold,
  workerGateRelease,
} from './helpers/lrTransitionContracts'

const LR_DATASET = 'gnomad_r4_lr'
// AMY2A locus, 50 kb. Small, dense with SNVs/indels, no haplotype build needed.
// Verified to render the LR Summary View with ~1120 variants.
const SUMMARY_REGION = '1-103600000-103650000'

test.describe('Long Read region page — Summary View', () => {
  let page: Page
  let metrics: ApiMetric[]

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    metrics = collectApiMetrics(page)
    await page.goto(`/region/${SUMMARY_REGION}?dataset=${LR_DATASET}`)
  })

  test.afterAll(async () => {
    await page?.close()
  })

  test('region metadata loads', async () => {
    await expect(page.getByText('Loading region')).toHaveCount(0, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: SUMMARY_REGION })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Region size')).toBeVisible()
  })

  test('summary view is the default and its controls render', async () => {
    await expect(page.locator('#lr-view-mode')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Summary View', { exact: true })).toBeVisible()
    await expect(page.getByText('Haplotype View', { exact: true })).toBeVisible()
    // No show_haplotypes in the URL means Summary View is active.
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
  })

  test('zoom controls narrow and reset the loaded region without navigation', async () => {
    await expect(page.getByText('Zoom Controls', { exact: true })).toBeVisible({ timeout: 20_000 })

    const originalUrl = page.url()
    await page.getByRole('button', { name: '3x' }).first().click()

    await expect(page.getByRole('button', { name: 'Set as region' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset zoom' })).toBeVisible()
    expect(page.url()).toBe(originalUrl)

    await page.getByRole('button', { name: 'Reset zoom' }).click()
    await expect(page.getByRole('button', { name: 'Set as region' })).toHaveCount(0)
  })

  test('LR variant table loads with rows', async () => {
    // NOTE: `#lr-variant-table-container` is (a bug) set on two nested divs, so
    // scope to the first. The table is div-based (no semantic `columnheader`
    // roles), so assert on visible text instead.
    await expect(page.locator('#lr-variant-table-container').first()).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText('Variant ID').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Showing .* variants/)).toBeVisible({ timeout: 30_000 })
  })

  test('report page-load metrics', async ({ page: _unusedPage }, testInfo) => {
    // Let any in-flight requests settle so their timing is captured.
    await page.waitForLoadState('networkidle').catch(() => {})
    await reportApiMetrics(testInfo, metrics)
    // The main LR variant query must have fired for this page to be meaningful.
    const lrQuery = metrics.find((m) => m.operationName === 'LongReadVariantsInRegion')
    expect(lrQuery, 'LongReadVariantsInRegion query should have fired').toBeTruthy()
    expect(lrQuery?.status).toBe(200)
  })
})

// Complete empty Struct-of-Arrays payload: valid RawPayload input for both the
// REST parser and the real haplotype worker, while keeping computation deterministic.
const HAPLOTYPE_RESPONSE = {
  variants: {
    variant_id: [],
    chrom: [],
    pos: [],
    end: [],
    ref: [],
    alt: [],
    allele_type: [],
    allele_length: [],
    freq_af: [],
    freq_ac: [],
    freq_an: [],
    rsid: [],
    cadd_phred: [],
    phylop: [],
    sv_consequences: [],
    dbsnp_id: [],
    tr_id: [],
    tr_motifs: [],
    gnomad_str: [],
    allele_methylation: [],
    motif_counts: [],
    allele_purity: [],
    short_read_match_id: [],
    populations: [],
  },
  carrier_variant_indices: {},
  carriers: [],
  auto_defaults: {
    floor: 0,
    ceiling: 1,
    defaultAf: 0,
    defaultClusterThreshold: 0,
    isClusteredView: false,
  },
}

const transitionViewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

const captureSlotGeometry = async (page: Page, testIds: string[]) =>
  Object.fromEntries(
    await Promise.all(
      testIds.map(async (testId) => {
        const box = await page.getByTestId(testId).boundingBox()
        expect(box, `${testId} should retain a layout box`).not.toBeNull()
        return [testId, box!]
      })
    )
  )

const expectExactSlotGeometry = (
  before: Record<string, { x: number; y: number; width: number; height: number }>,
  after: Record<string, { x: number; y: number; width: number; height: number }>,
  label: string
) => {
  Object.keys(before).forEach((slot) => {
    ;(['x', 'y', 'width', 'height'] as const).forEach((dimension) => {
      expect(
        Math.abs(after[slot][dimension] - before[slot][dimension]),
        `${label}: ${slot} ${dimension} changed from ${before[slot][dimension]} to ${after[slot][dimension]}`
      ).toBeLessThanOrEqual(2)
    })
  })
}

transitionViewports.forEach((viewport) => {
  test(`LR view transitions preserve geometry and requests on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await installWorkerReadyGate(page)

    let releaseHaplotypeResponse!: () => void
    const haplotypeResponseGate = new Promise<void>((resolve) => {
      releaseHaplotypeResponse = resolve
    })
    await page.route('**/api/lr/haplotype-groups?**', async (route) => {
      await haplotypeResponseGate
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(HAPLOTYPE_RESPONSE),
      })
    })

    const requests = collectLrRequestCounts(page)
    await page.goto(`/region/${SUMMARY_REGION}?dataset=${LR_DATASET}`)
    await expect(page.locator('#lr-view-mode')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Showing .* variants/)).toBeVisible({ timeout: 30_000 })

    // Summary has no haplotype viewport, but its persistent top-bar controls are
    // the coordinate baseline for every phase after opting into Haplotype View.
    const viewShell = page.getByTestId('lr-haplotype-viewport-shell')
    const viewportStatus = page.getByTestId('lr-haplotype-viewport-status')
    await expect(viewShell).toHaveCount(0)
    const summaryGeometry = await captureLrGeometry(page)
    await expectNoHorizontalOverflow(page)
    const initialDocumentToken = await documentToken(page)
    const initialNavigationCount = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    )
    expect(requests.graphQL.LongReadVariantsInRegion).toBe(1)
    expect(requests.haplotypeRest).toBe(0)

    const haplotypeRadio = page.getByRole('radio', { name: 'Haplotype View' })
    await haplotypeRadio.focus()
    await haplotypeRadio.press('Space')
    await expect(haplotypeRadio).toBeChecked()
    await expect(haplotypeRadio).toBeFocused()
    await expect.poll(() => requests.haplotypeRest).toBe(1)
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBe('true')
    expect(await documentToken(page)).toBe(initialDocumentToken)
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
      initialNavigationCount
    )

    await expect(viewShell).toBeVisible()
    await expect(viewportStatus).toHaveText('Fetching variant data…')
    await expect(viewShell).toHaveAttribute('aria-busy', 'true')
    const restPendingGeometry = await captureLrGeometry(page, viewShell, true)
    expectStableGeometry(summaryGeometry, restPendingGeometry, 'Summary → REST pending', [
      'viewModeY',
      'searchY',
    ])
    await expectNoHorizontalOverflow(page)

    releaseHaplotypeResponse()
    await waitForHeldWorkerMessage(page, 'READY')
    await expect(viewportStatus).toHaveText(/Grouping 0 (?:variants|samples) into haplotypes…/)
    await expect(haplotypeRadio).toBeFocused()
    const workerPendingGeometry = await captureLrGeometry(page, viewShell, true)
    expectStableGeometry(summaryGeometry, workerPendingGeometry, 'Summary → worker pending', [
      'viewModeY',
      'searchY',
    ])
    expectStableGeometry(
      restPendingGeometry,
      workerPendingGeometry,
      'REST pending → worker pending',
      ['groupingY']
    )
    await expectNoHorizontalOverflow(page)

    await workerGateRelease(page)
    await expect(page.locator('#lr-variant-table-container').first()).toHaveCSS('opacity', '1')
    await expect(viewportStatus).toHaveText('There is no haplotype data for this region.')
    await expect(viewShell).toHaveAttribute('aria-busy', 'false')
    await expect(haplotypeRadio).toBeFocused()
    const haplotypeReadyGeometry = await captureLrGeometry(page, viewShell, true)
    expectStableGeometry(summaryGeometry, haplotypeReadyGeometry, 'Summary → Haplotype ready', [
      'viewModeY',
      'searchY',
    ])
    expectStableGeometry(restPendingGeometry, haplotypeReadyGeometry, 'Haplotype pending → ready', [
      'groupingY',
    ])
    await expectNoHorizontalOverflow(page)

    await page.waitForLoadState('networkidle').catch(() => {})
    expect(requests.haplotypeRest).toBe(1)
    expect(await workerMessageCount(page, 'INIT')).toBe(1)
    expect(requests.graphQL.LongReadVariantsInRegion).toBe(1)
    expect(requests.graphQL.RegionSampleMetadata).toBe(1)
    const requestsBeforeGrouping = JSON.stringify(requests)

    const transitionGrouping = async (
      label: 'Diploid' | 'Similarity Clusters',
      referenceGeometry: Awaited<ReturnType<typeof captureLrGeometry>>
    ) => {
      await workerGateHold(page)
      const radio = page.getByRole('radio', { name: label })
      await radio.focus()
      await radio.press('Space')
      await expect(radio).toBeChecked()
      await expect(radio).toBeFocused()
      await waitForHeldWorkerMessage(page, 'UPDATED')

      const pendingGeometry = await captureLrGeometry(page, viewShell, true)
      expectStableGeometry(referenceGeometry, pendingGeometry, `${label} worker pending`, [
        'shellHeight',
        'viewModeY',
        'searchY',
        'groupingY',
      ])
      await expectNoHorizontalOverflow(page)
      await workerGateRelease(page)
      await expect(page.locator('#lr-variant-table-container').first()).toHaveCSS('opacity', '1')
      await expect(radio).toBeFocused()

      const readyGeometry = await captureLrGeometry(page, viewShell, true)
      expectStableGeometry(referenceGeometry, readyGeometry, `${label} ready`, [
        'shellHeight',
        'viewModeY',
        'searchY',
        'groupingY',
      ])
      await expectNoHorizontalOverflow(page)
      return readyGeometry
    }

    const similarityGeometry = await transitionGrouping(
      'Similarity Clusters',
      haplotypeReadyGeometry
    )
    await transitionGrouping('Diploid', similarityGeometry)
    expect(JSON.stringify(requests)).toBe(requestsBeforeGrouping)

    // Same scope keeps exactly one raw payload and its current computed
    // representation resident across Summary → Haplotype re-entry.
    await page.getByRole('radio', { name: 'Summary View' }).click()
    await expect(page.getByRole('radio', { name: 'Summary View' })).toBeChecked()
    await page.getByRole('radio', { name: 'Haplotype View' }).click()
    await expect(page.getByRole('radio', { name: 'Haplotype View' })).toBeChecked()
    await expect(page.locator('#lr-variant-table-container').first()).toHaveCSS('opacity', '1')
    expect(requests.haplotypeRest).toBe(1)
    expect(await workerMessageCount(page, 'INIT')).toBe(1)
    expect(JSON.stringify(requests)).toBe(requestsBeforeGrouping)

    expect(await documentToken(page)).toBe(initialDocumentToken)
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
      initialNavigationCount
    )

    await expectNoHorizontalOverflow(page)
    await expectControlWithinViewport(page, viewShell, 'long-read view shell')
    await expectControlWithinViewport(page, page.locator('#lr-view-mode'), 'view mode control')
    await expectControlWithinViewport(page, page.locator('#grouping-mode'), 'grouping control')
    await expectControlWithinViewport(
      page,
      page.getByRole('textbox', { name: 'Filter long-read variants' }),
      'variant search'
    )
  })

  test(`cohort and dataset revalidation retain slots and exact request identity on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    await installWorkerReadyGate(page)

    let heldOperations = new Set<string>()
    let releaseRequests = () => {}
    const hold = (operations: string[]) => {
      heldOperations = new Set(operations)
      let release!: () => void
      const gate = new Promise<void>((resolve) => {
        release = resolve
      })
      releaseRequests = () => {
        heldOperations.clear()
        release()
      }
      return gate
    }
    let requestGate = Promise.resolve()

    await page.route('**/api/', async (route) => {
      let body: any
      try {
        body = route.request().postDataJSON()
      } catch {
        await route.continue()
        return
      }
      const operationName =
        body?.operationName || body?.query?.match(/\b(?:query|mutation)\s+(\w+)/)?.[1]
      if (operationName && heldOperations.has(operationName)) await requestGate
      await route.continue()
    })

    const requests = collectLrRequestCounts(page)
    await page.goto(
      `/region/${SUMMARY_REGION}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc&variant_id=1-103610000-A-T&show_tree=true&methylation_sample=stale`
    )
    await expect(page.getByText(/Showing .* variants/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('lr-coverage-slot')).toHaveAttribute('aria-busy', 'false', {
      timeout: 20_000,
    })

    const documentId = await documentToken(page)
    const navigationCount = await page.evaluate(
      () => performance.getEntriesByType('navigation').length
    )
    const lrSlots = ['lr-control-slot', 'lr-plot-slot', 'lr-table-slot', 'lr-coverage-slot']
    const beforeCohort = await captureSlotGeometry(page, lrSlots)
    expect(requests.graphQL.Region).toBe(1)
    expect(requests.graphQL.LongReadVariantsInRegion).toBe(1)
    expect(requests.graphQL.LRCoverage).toBe(1)

    requestGate = hold(['LongReadVariantsInRegion', 'LRCoverage'])
    const cohortGroup = page.getByRole('group', { name: 'Long-read cohort:' })
    const aou = cohortGroup.getByRole('radio', { name: 'All of Us' })
    await aou.focus()
    await aou.press('Space')

    const cohortStatus = page
      .getByRole('status')
      .filter({ hasText: 'Updating long-read variants for All of Us…' })
    await expect(cohortStatus).toBeVisible()
    await expect(cohortStatus).toBeFocused()
    await expect(page.getByTestId('lr-request-shell')).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByTestId('lr-coverage-slot')).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByRole('group', { name: 'Long-read cohort:' })).toHaveCount(0)
    expect(new URL(page.url()).searchParams.get('lr_cohort')).toBe('aou')
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
    const pendingCohort = await captureSlotGeometry(page, lrSlots)
    expectExactSlotGeometry(beforeCohort, pendingCohort, 'cohort pending')
    expect(requests.graphQL.LongReadVariantsInRegion).toBe(2)
    expect(requests.graphQL.LRCoverage).toBe(2)

    releaseRequests()
    await expect(page.getByTestId('lr-request-shell')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30_000,
    })
    await expect(page.getByTestId('lr-coverage-slot')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30_000,
    })
    await expect(cohortGroup.getByRole('radio', { name: 'All of Us' })).toBeFocused()
    expect(requests.graphQL.LongReadVariantsInRegion).toBe(2)
    expect(requests.graphQL.LRCoverage).toBe(2)

    const beforeDataset = await captureSlotGeometry(page, [
      'region-request-shell',
      ...lrSlots,
    ])
    requestGate = hold(['Region'])
    const shortReadLink = page
      .locator('a[href*="dataset=gnomad_r4&"], a[href$="dataset=gnomad_r4"]')
      .first()
    await shortReadLink.evaluate((link: HTMLAnchorElement) => link.click())

    const datasetStatus = page
      .getByRole('status')
      .filter({ hasText: 'Updating region for gnomAD v4.1.1…' })
    await expect(datasetStatus).toBeVisible()
    await expect(datasetStatus).toBeFocused()
    await expect(page.getByTestId('region-request-shell')).toHaveAttribute('aria-busy', 'true')
    await expect(page.getByRole('group', { name: 'Long-read cohort:' })).toHaveCount(0)
    const pendingDataset = await captureSlotGeometry(page, [
      'region-request-shell',
      ...lrSlots,
    ])
    expectExactSlotGeometry(beforeDataset, pendingDataset, 'dataset pending')
    expect(requests.graphQL.Region).toBe(2)
    expect(requests.graphQL.VariantInRegion || 0).toBe(0)
    expect(requests.graphQL.RegionCoverage || 0).toBe(0)

    const datasetParams = new URL(page.url()).searchParams
    expect(Object.fromEntries(datasetParams.entries())).toEqual({
      dataset: 'gnomad_r4',
      variant_id: '1-103610000-A-T',
    })

    releaseRequests()
    await expect(page.getByTestId('region-request-shell')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30_000,
    })
    await expect.poll(() => requests.graphQL.VariantInRegion || 0).toBe(1)
    await expect.poll(() => requests.graphQL.RegionCoverage || 0).toBe(1)
    expect(requests.graphQL.Region).toBe(2)
    expect(await documentToken(page)).toBe(documentId)
    expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(
      navigationCount
    )

    await testInfo.attach(`lr-revalidation-${viewport.name}.json`, {
      body: JSON.stringify(
        {
          viewport,
          geometry: {
            beforeCohort,
            pendingCohort,
            beforeDataset,
            pendingDataset,
          },
          requests,
        },
        null,
        2
      ),
      contentType: 'application/json',
    })
  })
})

test.describe('optional short-read coverage context', () => {
  const contextRegion = '4-39343424-39353479'

  test('is request-free while off, then uses gnomad_r4 and preserves URL state', async ({
    page,
  }) => {
    const shortReadRequests: any[] = []
    await page.route('**/api/', async (route) => {
      const body = route.request().postDataJSON()
      if (body?.operationName !== 'RegionCoverage') {
        await route.continue()
        return
      }
      shortReadRequests.push(body)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            region: {
              coverage: {
                exome: [{ pos: 39344000, over_20: 0.95 }],
                genome: [{ pos: 39344000, over_20: 0.9 }],
              },
            },
          },
        }),
      })
    })

    await page.goto(
      `/region/${contextRegion}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc&show_haplotypes=true&variant_id=kept&other=kept`
    )
    const toggle = page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    await expect(toggle).toBeVisible({ timeout: 20_000 })
    await expect(toggle).not.toBeChecked()
    expect(shortReadRequests).toHaveLength(0)

    await toggle.press('Space')
    await expect(toggle).toBeChecked()
    await expect.poll(() => shortReadRequests.length).toBe(1)
    expect(shortReadRequests[0].variables).toMatchObject({
      datasetId: 'gnomad_r4',
      referenceGenome: 'GRCh38',
      includeExomeCoverage: true,
      includeGenomeCoverage: true,
    })
    const params = new URL(page.url()).searchParams
    expect(params.get('show_short_read_coverage')).toBe('true')
    expect(params.get('lr_cohort')).toBe('hgsvc_hprc')
    expect(params.get('show_haplotypes')).toBe('true')
    expect(params.get('variant_id')).toBe('kept')
    expect(params.get('other')).toBe('kept')
    await expect(page.getByText('Short-read exomes (gnomAD v4.0)')).toBeVisible()
    await expect(page.getByText('Short-read genomes (gnomAD v3.0.1)')).toBeVisible()
    await page.getByRole('button', { name: 'About short-read coverage context' }).click()
    await expect(
      page.getByText(/Different samples, assays, and processing pipelines/)
    ).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('#lr-coverage-metric')).toHaveCount(1)
    await expect(page.locator('#sr-coverage-metric')).toHaveCount(1)
    const coveragePlotHeights = await page
      .locator('#lr-coverage-metric, #sr-coverage-metric')
      .evaluateAll((controls) =>
        controls.map((control) => {
          let container = control.parentElement
          while (container && !container.querySelector('svg')) container = container.parentElement
          return container?.querySelector('svg')?.getAttribute('height')
        })
      )
    expect(coveragePlotHeights).toEqual(['100', '100'])

    await toggle.press('Space')
    await expect(toggle).not.toBeChecked()
    expect(new URL(page.url()).searchParams.get('show_short_read_coverage')).toBeNull()
    await expect(page.locator('#sr-coverage-metric')).toHaveCount(0)
  })

  test('offers the opt-in at the bounded chr22 acceptance loci', async ({ page }) => {
    const expectOptInAt = async (region: string) => {
      await page.goto(`/region/${region}?dataset=${LR_DATASET}&lr_cohort=hgsvc_hprc`)
      await expect(
        page.getByRole('checkbox', { name: 'Show short-read coverage context' })
      ).toBeVisible({ timeout: 20_000 })
    }

    await expectOptInAt('22-21227238-21327237')
    await expectOptInAt('22-22424495-22524494')
    await expectOptInAt('22-42123192-42132193')
  })

  test('is guarded on X and remains operable without overflow on mobile', async ({ page }) => {
    await page.goto(`/region/X-2781000-2782000?dataset=${LR_DATASET}&show_short_read_coverage=true`)
    await expect(
      page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    ).toHaveCount(0)
    await expect(page.getByText(/available only for GRCh38 autosomes 1–22/)).toBeVisible({
      timeout: 20_000,
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/region/${contextRegion}?dataset=${LR_DATASET}`)
    const toggle = page.getByRole('checkbox', { name: 'Show short-read coverage context' })
    await expect(toggle).toBeVisible({ timeout: 20_000 })
    const box = await toggle.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(20)
    const horizontallyOverflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(horizontallyOverflowing).toBe(false)
  })
})

const runY1 = process.env.LR_Y1_ENABLED === 'true'

test.describe('Long Read Y1 mode', () => {
  test.skip(!runY1, 'requires a configured Y1 stack containing chr22')

  test('switches cohorts, clears unsupported state, and keeps the AoU notice in view help', async ({
    page,
  }) => {
    await page.goto(
      '/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc&show_haplotypes=true'
    )

    const cohortOptions = page.getByRole('group', { name: 'Long-read cohort:' })
    await expect(cohortOptions.getByRole('radio', { name: 'HGSVC/HPRC' })).toBeChecked()
    await cohortOptions.getByRole('radio', { name: 'All of Us' }).click()

    await expect(cohortOptions.getByRole('radio', { name: 'All of Us' })).toBeChecked()
    expect(new URL(page.url()).searchParams.get('lr_cohort')).toBe('aou')
    expect(new URL(page.url()).searchParams.get('show_haplotypes')).toBeNull()
    await expect(
      page.getByText('All of Us is summary-only; Haplotype View is unavailable.')
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'Long Read Data Views' }).click()
    await expect(
      page.getByText('All of Us is summary-only; Haplotype View is unavailable.')
    ).toBeVisible()
  })

  test('does not render missing frequency values as zero', async ({ page }) => {
    await page.goto('/region/22-11160001-11170000?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc')
    const unavailableCell = page.locator('td.numeric span[title="Unavailable"]').first()
    await expect(unavailableCell).toBeVisible()
    await expect(unavailableCell).toHaveText('—')
  })
})
