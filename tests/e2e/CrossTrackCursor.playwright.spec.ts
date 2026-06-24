import { test, expect, type Page } from '@playwright/test'

let page: Page

test.afterAll(async () => {
  await page.close()
})

// SynchronizedCursor keeps its <line> in the DOM at all times and toggles the
// inline `display` style to show ('') or hide ('none') it, so visibility is
// asserted via `display` rather than DOM presence. The gene page mounts two
// SynchronizedCursor instances (the feature tracks and the ClinVar + gnomAD
// tracks), so there are always two lines and they move in lockstep.
const CURSOR_LINE_COUNT = 2

const allCursorLinesHidden = (p: Page) =>
  p
    .getByTestId('region-viewer-cursor-line')
    .evaluateAll(
      (els) => els.length > 0 && els.every((el) => (el as SVGElement).style.display === 'none')
    )

const allCursorLinesVisible = (p: Page) =>
  p
    .getByTestId('region-viewer-cursor-line')
    .evaluateAll(
      (els) => els.length > 0 && els.every((el) => (el as SVGElement).style.display !== 'none')
    )

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

  test('cursor lines are present but hidden until the user hovers', async () => {
    await expect(page.getByTestId('region-viewer-cursor-line')).toHaveCount(CURSOR_LINE_COUNT)
    await expect.poll(() => allCursorLinesHidden(page)).toBe(true)
  })

  test('hovering shows a synchronized line spanning both ClinVar and gnomAD variants', async () => {
    const viewingInTable = page.getByText('Viewing in table')
    await expect(viewingInTable).toBeVisible({ timeout: 10_000 })
    await viewingInTable.scrollIntoViewIfNeeded()

    const titleBox = await viewingInTable.boundingBox()
    if (!titleBox) throw new Error('Could not measure "Viewing in table" bounding box')

    // Make ClinVar title visible too so we can measure its position.
    const clinvarTitle = page.getByText(/^ClinVar variants \(/).first()
    await expect(clinvarTitle).toBeAttached({ timeout: 10_000 })
    const clinvarBox = await clinvarTitle.boundingBox()
    if (!clinvarBox) throw new Error('Could not measure ClinVar title bounding box')

    await page.mouse.move(titleBox.x + titleBox.width + 400, titleBox.y + titleBox.height / 2, {
      steps: 5,
    })

    // Hovering broadcasts the position to every instance, so both lines become
    // visible together.
    await expect.poll(() => allCursorLinesVisible(page)).toBe(true)

    // The second instance (DOM order: feature tracks first, then variant tracks)
    // wraps the ClinVar and gnomAD tracks together. Its line is a vertical SVG
    // <line> with zero geometric width, so .toBeVisible() reports it as hidden;
    // measure its geometry directly instead. The line's top starts at the top of
    // the wrapping overlay (which begins above ClinVar), so the top should be at
    // or above the ClinVar title and the bottom at or below the gnomAD title.
    const clinvarToGnomadLine = page.getByTestId('region-viewer-cursor-line').nth(1)
    const lineBox = await clinvarToGnomadLine.boundingBox()
    if (!lineBox) throw new Error('Could not measure cursor line bounding box')
    expect(lineBox.y).toBeLessThanOrEqual(clinvarBox.y)
    expect(lineBox.y + lineBox.height).toBeGreaterThanOrEqual(titleBox.y + titleBox.height)
  })

  test('moving the mouse away hides both cursor lines again', async () => {
    // Move mouse to top-left of the page, well away from any track.
    await page.mouse.move(5, 5)
    await expect.poll(() => allCursorLinesHidden(page)).toBe(true)
  })
})
