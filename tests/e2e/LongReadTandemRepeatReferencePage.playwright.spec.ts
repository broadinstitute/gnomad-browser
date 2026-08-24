import { expect, test } from '@playwright/test'

const atxn1 = '6-16327633-16327723-TGC'
const htt =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'

const result = (status: string, ids: string[] = [], reason_code: string | null = null) => ({
  status,
  reason_code,
  source_database: 'gnomad_lr_y1_full_genome',
  source_release: 'prototype',
  source_run_id: 'browser-routed-run',
  candidates: ids.map((canonical_id) => ({ canonical_id })),
})

const row = (
  id: string,
  chrom: string,
  start: number,
  stop: number,
  motif: string,
  hgsvc_hprc = result('EXACT_UNIQUE', [`${chrom}-${start}-${stop}-${motif}`]),
  aou = result('EXACT_UNIQUE', [`${chrom}-${start}-${stop}-${motif}`])
) => ({
  short_record: {
    id,
    gene: { symbol: id },
    main_reference_region: { reference_genome: 'GRCh38', chrom, start, stop },
    reference_repeat_unit: motif,
    associated_diseases: [{ name: `${id} disease`, symbol: `${id}D`, omim_id: '123456' }],
  },
  hgsvc_hprc,
  aou,
})

const nodes = [
  row(
    'ATXN1',
    '6',
    16327633,
    16327723,
    'TGC',
    result('EXACT_UNIQUE', [atxn1]),
    result('EXACT_UNIQUE', [atxn1])
  ),
  row(
    'HTT',
    '4',
    3074876,
    3074933,
    'CAG',
    result('EXACT_UNIQUE', [htt]),
    result('EXACT_UNIQUE', [htt])
  ),
  row('FMR1', 'X', 147911990, 147912053, 'CGG', result('NONE'), result('NONE')),
  row(
    'MULTI',
    '1',
    99,
    120,
    'AAA',
    result('MULTIPLE', ['1-99-120-AAA', '1-90-130-A+1-99-120-AAA']),
    result('AMBIGUOUS_COMPONENT', [], 'DUPLICATE_COMPONENT')
  ),
  row(
    'OFFLINE',
    '2',
    299,
    320,
    'TTT',
    result('UNAVAILABLE', [], 'SOURCE_UNAVAILABLE'),
    result('AMBIGUOUS_CATALOG', [], 'DUPLICATE_CATALOG_KEY')
  ),
  ...Array.from({ length: 73 }, (_, index) =>
    row(
      `ZLOCUS${String(index + 1).padStart(2, '0')}`,
      '22',
      1000 + index * 10,
      1009 + index * 10,
      'AC'
    )
  ),
]

const installReferenceResponse = async (page: any) => {
  const requests: any[] = []
  await page.route('**/api/**', async (route: any) => {
    const request = route.request()
    const payload = request.postDataJSON()
    if (payload.operationName !== 'LongReadTandemRepeatReference') {
      await route.continue()
      return
    }
    requests.push(payload)
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          long_read_tandem_repeat_reference: {
            nodes,
            total_count: nodes.length,
            page_info: { has_next_page: false, end_cursor: null },
          },
        },
      }),
    })
  })
  return requests
}

test.describe('short-read STR to long-read reference index', () => {
  test('loads all 78 rows once, paginates, and preserves canonical fixed-dataset links', async ({
    page,
  }) => {
    const requests = await installReferenceResponse(page)
    await page.goto('/long-read-tandem-repeat-reference')

    await expect(
      page.getByRole('heading', { name: 'Short-read STR ↔ long-read locus reference' })
    ).toBeVisible()
    await expect(page.getByRole('status')).toContainText('78 matching loci. Showing 1–50.')
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(50)
    expect(requests).toHaveLength(1)
    expect(requests[0].query).toContain('first: 100')
    if (process.env.REFERENCE_SCREENSHOT_DIR) {
      await page.screenshot({
        path: `${process.env.REFERENCE_SCREENSHOT_DIR}/reference-index-wide.png`,
        fullPage: true,
      })
    }

    const atxn1Row = page.getByRole('row', { name: /ATXN1/ })
    await expect(atxn1Row.getByRole('link', { name: 'ATXN1' })).toHaveAttribute(
      'href',
      '/short-tandem-repeat/ATXN1?dataset=gnomad_r4'
    )
    await expect(atxn1Row.getByRole('link', { name: atxn1 }).first()).toHaveAttribute(
      'href',
      `/tandem-repeat/${atxn1}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(28)
    expect(requests).toHaveLength(1)
  })

  test('distinguishes none, multiple, unavailable, and ambiguous without picking a candidate', async ({
    page,
  }) => {
    await installReferenceResponse(page)
    await page.goto('/long-read-tandem-repeat-reference')

    await page.getByLabel('Match status').selectOption('multiple')
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(1)
    const multiple = page.getByRole('row', { name: /MULTI/ })
    await expect(multiple.getByText('Multiple containing LR loci')).toBeVisible()
    await expect(multiple.getByLabel('HGSVC/HPRC candidate loci').getByRole('link')).toHaveCount(2)
    await expect(multiple.getByText('Ambiguous identity')).toBeVisible()

    await page.getByLabel('Match status').selectOption('unavailable_ambiguous')
    await expect(page.getByText('Cohort unavailable')).toBeVisible()
    await expect(page.getByText('Ambiguous identity')).toHaveCount(2)

    await page.getByLabel('Match status').selectOption('none')
    await expect(page.getByRole('row', { name: /FMR1/ })).toBeVisible()
    await expect(page.getByText('No exact component match')).toHaveCount(2)
  })

  test('supports search, sort, direct reload, and a keyboard-scrollable table at 390px', async ({
    page,
  }) => {
    const requests = await installReferenceResponse(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/long-read-tandem-repeat-reference')
    await page.reload()
    await expect(page.getByRole('heading', { name: /Short-read STR/ })).toBeVisible()
    const requestCountAfterReload = requests.length
    if (process.env.REFERENCE_SCREENSHOT_DIR) {
      await page.screenshot({
        path: `${process.env.REFERENCE_SCREENSHOT_DIR}/reference-index-390px.png`,
        fullPage: true,
      })
    }

    await page.getByRole('searchbox', { name: 'Search' }).fill('HTT disease')
    await expect(page.getByRole('status')).toContainText('1 matching loci')
    await expect(page.getByRole('row', { name: /HTT/ })).toBeVisible()
    await page.getByLabel('Sort').selectOption('genomic')

    const scroller = page.getByTestId('long-read-tr-reference-table-scroller')
    await scroller.focus()
    await expect(scroller).toBeFocused()
    const geometry = await page.evaluate(() => ({
      documentScrollWidth: document.documentElement.scrollWidth,
      documentClientWidth: document.documentElement.clientWidth,
      tableScrollWidth: document.querySelector<HTMLElement>(
        '[data-testid="long-read-tr-reference-table-scroller"]'
      )!.scrollWidth,
      tableClientWidth: document.querySelector<HTMLElement>(
        '[data-testid="long-read-tr-reference-table-scroller"]'
      )!.clientWidth,
    }))
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.documentClientWidth + 1)
    expect(geometry.tableScrollWidth).toBeGreaterThan(geometry.tableClientWidth)
    expect(requests).toHaveLength(requestCountAfterReload)
  })
})
