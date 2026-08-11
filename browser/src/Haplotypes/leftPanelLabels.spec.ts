import { describe, expect, test } from '@jest/globals'
import {
  formatDiploidSampleLabel,
  getCollapsedClusterLabelLayout,
  getExpandedMemberLabelLayout,
} from './leftPanelLabels'

describe('haplotype left-panel labels', () => {
  test('summarizes multi-sample diplotype rows instead of joining IDs on one line', () => {
    expect(formatDiploidSampleLabel([])).toBe('')
    expect(formatDiploidSampleLabel([{ sample_id: 'HG02165' }])).toBe('HG02165')
    expect(formatDiploidSampleLabel([
      { sample_id: 'HG02165' },
      { sample_id: 'HG02293' },
    ])).toBe('HG02165 +1')
    expect(formatDiploidSampleLabel([
      { sample_id: 'HG02165' },
      { sample_id: 'HG02293' },
      { sample_id: 'HG02300' },
    ])).toBe('HG02165 +2')
  })

  test('right-aligns collapsed-cluster counts inside the left panel', () => {
    const leftPanelWidth = 115
    const layout = getCollapsedClusterLabelLayout(leftPanelWidth)

    expect(layout.countTextAnchor).toBe('end')
    expect(layout.countX).toBeLessThan(leftPanelWidth)
    expect(layout.barX + layout.barWidth).toBeLessThanOrEqual(layout.countX - 24)
  })

  test('fits expanded-member sample and variant counts inside a narrow left panel', () => {
    const leftPanelWidth = 115
    const layout = getExpandedMemberLabelLayout(leftPanelWidth, 24, 123, 456)

    expect(layout.barWidth).toBeGreaterThan(0)
    expect(layout.sampleCountTextAnchor).toBe('end')
    expect(layout.variantCountTextAnchor).toBe('end')
    expect(layout.barX + layout.barWidth).toBeLessThanOrEqual(
      layout.sampleCountX - layout.sampleCountWidth - 4
    )
    expect(layout.sampleCountX).toBeLessThan(layout.variantCircleX)
    expect(layout.variantCircleX + 4).toBeLessThanOrEqual(
      layout.variantCountX - layout.variantCountWidth
    )
    expect(layout.variantCountX).toBeLessThan(leftPanelWidth)
  })

  test('reserves more bar-adjacent space for longer member counts', () => {
    const shortCounts = getExpandedMemberLabelLayout(150, 24, 1, 2)
    const longCounts = getExpandedMemberLabelLayout(150, 24, 1234, 5678)

    expect(shortCounts.barWidth).toBe(80)
    expect(longCounts.barWidth).toBeLessThan(shortCounts.barWidth)
    expect(longCounts.variantCountX).toBe(shortCounts.variantCountX)
  })
})
