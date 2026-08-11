import { describe, expect, test } from '@jest/globals'
import { formatDiploidSampleLabel, getCollapsedClusterLabelLayout } from './leftPanelLabels'

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
})
