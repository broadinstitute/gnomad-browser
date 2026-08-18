import {
  DIPLOID_SAMPLE_HOVER_HALF_HEIGHT,
  DIPLOID_SAMPLE_LABEL_CENTER_OFFSET,
  DIPLOID_SAMPLE_LABEL_FONT_SIZE,
  HAPLOTYPE_CONTENT_TOP_PADDING,
  HAPLOTYPE_ROW_CENTER_Y,
  scrollTopForHaplotypeRow,
  stackHaplotypeRows,
} from './haplotypeVerticalLayout'

describe('haplotype vertical layout', () => {
  test('keeps the complete first diploid sample label and ancestry hover target in bounds', () => {
    const { rowOffsets } = stackHaplotypeRows([58, 58])
    const firstRowCenter = rowOffsets[0] + HAPLOTYPE_ROW_CENTER_Y
    const labelCenter = firstRowCenter - DIPLOID_SAMPLE_LABEL_CENTER_OFFSET
    const labelTop = labelCenter - DIPLOID_SAMPLE_LABEL_FONT_SIZE / 2
    const hoverTargetTop = firstRowCenter - DIPLOID_SAMPLE_HOVER_HALF_HEIGHT

    expect(rowOffsets[0]).toBe(HAPLOTYPE_CONTENT_TOP_PADDING)
    expect(labelTop).toBeGreaterThanOrEqual(0)
    expect(hoverTargetTop).toBeGreaterThanOrEqual(0)
  })

  test('preserves the top boundary through diploid, similarity, and expanded-row layouts', () => {
    const diploid = stackHaplotypeRows([58, 58])
    const similarity = stackHaplotypeRows([25, 25])
    const expandedSimilarity = stackHaplotypeRows([25, 81, 25])

    expect(diploid.rowOffsets[0]).toBe(HAPLOTYPE_CONTENT_TOP_PADDING)
    expect(similarity.rowOffsets[0]).toBe(HAPLOTYPE_CONTENT_TOP_PADDING)
    expect(expandedSimilarity.rowOffsets).toEqual([
      HAPLOTYPE_CONTENT_TOP_PADDING,
      HAPLOTYPE_CONTENT_TOP_PADDING + 25,
      HAPLOTYPE_CONTENT_TOP_PADDING + 25 + 81,
    ])
    expect(expandedSimilarity.totalHeight).toBe(HAPLOTYPE_CONTENT_TOP_PADDING + 25 + 81 + 25)
  })

  test('retains the top inset when programmatically aligning a row to the viewport', () => {
    expect(scrollTopForHaplotypeRow(HAPLOTYPE_CONTENT_TOP_PADDING)).toBe(0)
    expect(scrollTopForHaplotypeRow(HAPLOTYPE_CONTENT_TOP_PADDING + 58)).toBe(58)
  })
})
