import { test, expect, type Page } from '@playwright/test'

let page: Page

test.afterAll(async () => {
  await page.close()
})

// The gene page always mounts four SynchronizedCursor instances under a single
// provider, in DOM order: the feature tracks (0), the ClinVar track (1), the
// gnomAD variants heading + toggle (2), and the gnomAD variant track (3). Each
// keeps its <line> in the DOM and toggles inline `display` to show ('') / hide
// ('none') it, so visibility is asserted via `display` rather than DOM presence.
//
// The gnomAD variant track cursor (index 3) is always enabled — its line stays on
// the variant track on hover, and clicking it scrolls the table. The "Extend
// position cursor" toggle (off by default) enables the other three so the line,
// plus a coordinate label, spans every track.
const TOTAL_CURSOR_LINES = 4
const GNOMAD_TRACK_LINE_INDEX = 3
const CLINVAR_LINE_INDEX = 1

const cursorLineDisplays = (p: Page) =>
  p
    .getByTestId('region-viewer-cursor-line')
    .evaluateAll((els) => els.map((el) => (el as SVGElement).style.display))

const visibleCursorLineCount = async (p: Page) =>
  (await cursorLineDisplays(p)).filter((display) => display !== 'none').length

test.describe('Cross-track cursor on the gene page', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto('/gene/ENSG00000169174?dataset=gnomad_r4')

    // Wait for the variant table to render so all tracks (transcripts, ClinVar,
    // pext if any, gnomAD variants) are present in the DOM.
    await expect(page.getByText('Loading variants')).toHaveCount(0, { timeout: 60_000 })
    await expect(page.getByRole('columnheader', { name: 'Variant ID' })).toBeVisible({
      timeout: 30_000,
    })
  })

  test('the cross-track cursor toggle is off by default', async () => {
    await expect(page.getByLabel('Extend position cursor')).not.toBeChecked()
    // All four instances are mounted regardless of the toggle...
    await expect(page.getByTestId('region-viewer-cursor-line')).toHaveCount(TOTAL_CURSOR_LINES)
    // ...but nothing is drawn until the user hovers.
    expect(await visibleCursorLineCount(page)).toBe(0)
  })

  test('with the toggle off, hovering shows a line only on the gnomAD variant track', async () => {
    const viewingInTable = page.getByText('Viewing in table')
    await expect(viewingInTable).toBeVisible({ timeout: 10_000 })
    await viewingInTable.scrollIntoViewIfNeeded()

    const titleBox = await viewingInTable.boundingBox()
    if (!titleBox) throw new Error('Could not measure "Viewing in table" bounding box')

    await page.mouse.move(titleBox.x + titleBox.width + 400, titleBox.y + titleBox.height / 2, {
      steps: 5,
    })

    // Only the always-on gnomAD variant track cursor (the last instance) is
    // enabled, so exactly one line is drawn.
    await expect.poll(() => visibleCursorLineCount(page)).toBe(1)
    const displays = await cursorLineDisplays(page)
    expect(displays[GNOMAD_TRACK_LINE_INDEX]).not.toBe('none')

    // The line must not extend above the "gnomAD variants" heading when the toggle
    // is off — it is confined to the variant track region below the heading.
    const heading = page.getByRole('heading', { name: 'gnomAD variants', exact: true })
    const headingBox = await heading.boundingBox()
    if (!headingBox) throw new Error('Could not measure "gnomAD variants" heading bounding box')

    const trackLine = page.getByTestId('region-viewer-cursor-line').nth(GNOMAD_TRACK_LINE_INDEX)
    const trackLineBox = await trackLine.boundingBox()
    if (!trackLineBox) throw new Error('Could not measure gnomAD track cursor line bounding box')
    expect(trackLineBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height)

    // Leave the page clean for the next test.
    await page.mouse.move(5, 5)
    await expect.poll(() => visibleCursorLineCount(page)).toBe(0)
  })

  test('enabling the toggle extends the line across ClinVar and gnomAD variants', async () => {
    await page.getByLabel('Extend position cursor').check()

    const viewingInTable = page.getByText('Viewing in table')
    await expect(viewingInTable).toBeVisible({ timeout: 10_000 })
    await viewingInTable.scrollIntoViewIfNeeded()

    const titleBox = await viewingInTable.boundingBox()
    if (!titleBox) throw new Error('Could not measure "Viewing in table" bounding box')

    // The ClinVar track title carries a variant count; use it to locate the
    // ClinVar region of the page.
    const clinvarTitle = page.getByText(/^ClinVar variants \(/).first()
    await expect(clinvarTitle).toBeAttached({ timeout: 10_000 })
    const clinvarBox = await clinvarTitle.boundingBox()
    if (!clinvarBox) throw new Error('Could not measure ClinVar title bounding box')

    await page.mouse.move(titleBox.x + titleBox.width + 400, titleBox.y + titleBox.height / 2, {
      steps: 5,
    })

    // Now every instance is enabled, so all lines are drawn together.
    await expect.poll(() => visibleCursorLineCount(page)).toBe(TOTAL_CURSOR_LINES)

    // Vertical SVG lines have zero geometric width, so .toBeVisible() reports
    // them as hidden; measure geometry instead. The ClinVar line covers the
    // ClinVar track and the gnomAD track line covers the gnomAD track, so between
    // them the cursor spans both sections.
    const clinvarLine = page.getByTestId('region-viewer-cursor-line').nth(CLINVAR_LINE_INDEX)
    const clinvarLineBox = await clinvarLine.boundingBox()
    if (!clinvarLineBox) throw new Error('Could not measure ClinVar cursor line bounding box')
    expect(clinvarLineBox.y).toBeLessThanOrEqual(clinvarBox.y + clinvarBox.height)

    const trackLine = page.getByTestId('region-viewer-cursor-line').nth(GNOMAD_TRACK_LINE_INDEX)
    const trackLineBox = await trackLine.boundingBox()
    if (!trackLineBox) throw new Error('Could not measure gnomAD track cursor line bounding box')
    expect(trackLineBox.y + trackLineBox.height).toBeGreaterThanOrEqual(titleBox.y)
  })

  test('moving the mouse away hides every cursor line again', async () => {
    // Move mouse to top-left of the page, well away from any track.
    await page.mouse.move(5, 5)
    await expect.poll(() => visibleCursorLineCount(page)).toBe(0)
  })
})
