import { expect, test } from '@playwright/test'

const atxn1 = '6-16327633-16327723-TGC'
const htt =
  '4-3074876-3074933-CAG+4-3074927-3074936-CAA+4-3074939-3074966-CCG+4-3074966-3074972-CCT+4-3074983-3074994-GCC+4-3075029-3075040-CCG'

const result = (status: string, ids: string[] = [], reason_code: string | null = null) => ({
  status,
  reason_code,
  proof_text:
    status === 'SOURCE_ABSENT'
      ? 'No exact or overlapping component is present in the complete admitted index.'
      : 'One exact ordered component identity is present in the complete admitted index.',
  source_database: 'gnomad_lr_y1_full_genome',
  source_release: 'y1',
  source_run_id: 'browser-routed-run',
  candidates: ids.map((canonical_id) => ({
    canonical_id,
    matched_component_index: 0,
    matched_component: { chrom: canonical_id.split('-')[0], start0: 1, end0: 2, motif: 'A' },
    matched_reference_region_index: 0,
    source_record_count: 1,
    source_record_membership_sha256:
      '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  })),
  diagnostic_candidates: [],
  diagnostic_candidate_identity_count: 0,
  diagnostic_candidates_truncated: false,
  diagnostic_candidate_identity_sha256:
    '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
})

const provenance = {
  dataset: 'gnomad_r4',
  source: 'Frozen gnomAD short-read tandem-repeat catalog snapshot',
  endpoint: 'https://gnomad.broadinstitute.org/api',
  queried_at: '2026-08-24',
  row_count: 78,
  compact_sha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  hard_ceiling: 500,
  reference_genome: 'GRCh38',
  coordinate_system: '0-based half-open',
  motif_identity: 'exact uppercase stored string',
  catalog_available: true,
  catalog_unavailable_reason: null,
  snapshot_contract_id: 'gnomad-short-tr-snapshot-2026-08-24',
  snapshot_contract_label: 'Frozen gnomAD short-read tandem-repeat catalog snapshot',
  snapshot_contract_scope: 'Frozen gnomAD snapshot only; not current TRExplorer membership.',
  snapshot_approval_state: 'PENDING_SCIENCE_OWNER',
  current_trexplorer_admitted: false,
  admitted_component_index_complete: true,
  admitted_component_index_database: 'gnomad_lr_y1_full_genome',
  admitted_component_index_release: 'y1',
  admitted_component_index_source_count: 48,
  admitted_component_index_source_record_count: 7046218,
  admitted_component_index_canonical_locus_count: 7046218,
  admitted_component_index_ordered_component_count: 7683258,
  admitted_component_index_inventory_sha256:
    '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
  diagnostic_max_candidates_per_status: 12,
  diagnostic_max_source_records_per_candidate: 8,
}

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
  row(
    'FMR1',
    'X',
    147911990,
    147912053,
    'CGG',
    result('SOURCE_ABSENT', [], 'NO_EXACT_OR_OVERLAPPING_ADMITTED_COMPONENT'),
    result('SOURCE_ABSENT', [], 'NO_EXACT_OR_OVERLAPPING_ADMITTED_COMPONENT')
  ),
  row(
    'MULTI',
    '1',
    99,
    120,
    'AAA',
    result('AMBIGUOUS', [], 'MULTIPLE_EXACT_ORDERED_COMPONENT_IDENTITIES'),
    result('AMBIGUOUS', [], 'MULTIPLE_EXACT_ORDERED_COMPONENT_IDENTITIES')
  ),
  row(
    'OFFLINE',
    '2',
    299,
    320,
    'TTT',
    result('UNAVAILABLE', [], 'SOURCE_UNAVAILABLE'),
    result('UNAVAILABLE', [], 'SOURCE_PROVENANCE_MISMATCH')
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
            provenance,
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
        path: `${process.env.REFERENCE_SCREENSHOT_DIR}/reference-index-cohort-cells-desktop.png`,
        fullPage: true,
      })
    }

    const atxn1Row = page.getByRole('row', { name: /ATXN1/ })
    await expect(atxn1Row.getByRole('link', { name: 'ATXN1' })).toHaveAttribute(
      'href',
      '/short-tandem-repeat/ATXN1?dataset=gnomad_r4'
    )
    const atxn1Locus = atxn1Row.getByRole('link', {
      name: 'Open HGSVC/HPRC long-read locus 1',
    })
    await expect(atxn1Locus).toHaveText('Open LR locus')
    await expect(atxn1Locus).toHaveAttribute(
      'href',
      `/tandem-repeat/${atxn1}?dataset=gnomad_r4_lr&lr_cohort=hgsvc_hprc`
    )
    await expect(atxn1Row.getByText('chr6:16,327,633–16,327,723 · TGC')).toHaveCount(2)
    await expect(page.getByRole('columnheader', { name: 'HGSVC/HPRC LR match' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'All of Us LR match' })).toBeVisible()

    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(28)
    expect(requests).toHaveLength(1)
  })

  test('distinguishes source absence, ambiguity, and unavailable provenance without selecting a candidate', async ({
    page,
  }) => {
    await installReferenceResponse(page)
    await page.goto('/long-read-tandem-repeat-reference')

    await page.getByLabel('Match status').selectOption('multiple')
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(1)
    const ambiguous = page.getByRole('row', { name: /MULTI/ })
    await expect(ambiguous.getByText('Exact identity is ambiguous')).toHaveCount(2)
    await expect(ambiguous.getByLabel('HGSVC/HPRC candidate loci')).toHaveCount(0)

    await page.getByLabel('Match status').selectOption('unavailable_ambiguous')
    await expect(page.getByTestId('long-read-tr-reference-row')).toHaveCount(2)
    await expect(
      page.getByText('Exact identity unavailable — provenance not validated')
    ).toHaveCount(2)

    await page.getByLabel('Match status').selectOption('none')
    const noMatch = page.getByRole('row', { name: /FMR1/ })
    await expect(noMatch).toBeVisible()
    await expect(noMatch.getByText('No exact admitted LR reference component')).toHaveCount(2)
    await expect(
      noMatch.getByText('Absent from the complete admitted component index')
    ).toHaveCount(2)
    await noMatch.getByText('Match details').first().click()
    await expect(noMatch.getByText('NO_EXACT_OR_OVERLAPPING_ADMITTED_COMPONENT')).toHaveCount(2)
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

    await page.getByRole('searchbox', { name: 'Search' }).fill('HTT disease')
    await expect(page.getByRole('status')).toContainText('1 matching loci')
    const httRow = page.getByRole('row', { name: /HTT/ })
    await expect(httRow).toBeVisible()
    await expect(httRow.getByText('6-component locus')).toHaveCount(2)
    await expect(httRow.getByRole('link', { name: 'Open All of Us long-read locus 1' })).toHaveText(
      'Open LR locus'
    )
    await page.getByLabel('Sort').selectOption('genomic')

    const scroller = page.getByTestId('long-read-tr-reference-table-scroller')
    const horizontalOffset = await scroller.evaluate((element) => {
      element.scrollTo(element.scrollWidth, 0)
      return element.scrollLeft
    })
    expect(horizontalOffset).toBeGreaterThan(0)
    if (process.env.REFERENCE_SCREENSHOT_DIR) {
      await page.screenshot({
        path: `${process.env.REFERENCE_SCREENSHOT_DIR}/reference-index-cohort-cells-390px.png`,
        fullPage: true,
      })
    }
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
