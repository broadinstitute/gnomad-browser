export const HAPLOTYPE_CONTENT_TOP_PADDING = 10
export const HAPLOTYPE_ROW_CENTER_Y = 12.5
export const DIPLOID_SAMPLE_LABEL_CENTER_OFFSET = 13
export const DIPLOID_SAMPLE_LABEL_FONT_SIZE = 11
export const DIPLOID_SAMPLE_HOVER_HALF_HEIGHT = 21

export const stackHaplotypeRows = (rowHeights: readonly number[]) => {
  const rowOffsets: number[] = []
  let totalHeight = HAPLOTYPE_CONTENT_TOP_PADDING

  rowHeights.forEach((height) => {
    rowOffsets.push(totalHeight)
    totalHeight += height
  })

  return { rowOffsets, totalHeight }
}

export const scrollTopForHaplotypeRow = (rowOffset: number) =>
  Math.max(0, rowOffset - HAPLOTYPE_CONTENT_TOP_PADDING)
