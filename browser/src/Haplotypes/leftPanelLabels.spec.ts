import { describe, expect, test } from '@jest/globals'
import {
  formatDiploidSampleLabel,
  formatExpandedMemberSampleTooltip,
  getCollapsedClusterLabelLayout,
  getExpandedMemberBarLayout,
  getStandaloneGroupLabelLayout,
} from './leftPanelLabels'

describe('haplotype left-panel labels', () => {
  test('summarizes multi-sample diplotype rows instead of joining IDs on one line', () => {
    expect(formatDiploidSampleLabel([])).toBe('')
    expect(formatDiploidSampleLabel([{ sample_id: 'HG02165' }])).toBe('HG02165')
    expect(formatDiploidSampleLabel([{ sample_id: 'HG02165' }, { sample_id: 'HG02293' }])).toBe(
      'HG02165 +1'
    )
    expect(
      formatDiploidSampleLabel([
        { sample_id: 'HG02165' },
        { sample_id: 'HG02293' },
        { sample_id: 'HG02300' },
      ])
    ).toBe('HG02165 +2')
  })

  test('right-aligns collapsed-cluster counts inside the left panel', () => {
    const leftPanelWidth = 115
    const layout = getCollapsedClusterLabelLayout(leftPanelWidth)

    expect(layout.countTextAnchor).toBe('end')
    expect(layout.countX).toBeLessThan(leftPanelWidth)
    expect(layout.barX + layout.barWidth).toBeLessThanOrEqual(layout.countX - 24)
  })

  test('gives expanded members a responsive bar without numeric decoration slots', () => {
    const layout = getExpandedMemberBarLayout(115, 24)

    expect(layout).toEqual({ barX: 29, barWidth: 82 })
    expect(layout.barX + layout.barWidth).toBe(111)
    expect(layout).not.toHaveProperty('sampleCountX')
    expect(layout).not.toHaveProperty('variantCircleX')
    expect(getExpandedMemberBarLayout(60, 24).barWidth).toBe(27)
  })

  test('formats expanded-member sample hover text for missing, duplicate, and multiple IDs', () => {
    expect(formatExpandedMemberSampleTooltip([])).toBe('Sample ID unavailable')
    expect(
      formatExpandedMemberSampleTooltip([{ sample_id: '' }, { sample_id: null }, undefined])
    ).toBe('Sample ID unavailable')
    expect(
      formatExpandedMemberSampleTooltip([{ sample_id: ' HG02165 ' }, { sample_id: 'HG02165' }])
    ).toBe('Sample ID: HG02165')
    expect(
      formatExpandedMemberSampleTooltip([
        { sample_id: 'HG02165' },
        { sample_id: 'HG02293' },
        { sample_id: '' },
      ])
    ).toBe('Sample IDs: HG02165, HG02293')
  })

  test('reserves more bar-adjacent space for longer standalone-group counts', () => {
    const shortCounts = getStandaloneGroupLabelLayout(150, 0, 1, 2)
    const longCounts = getStandaloneGroupLabelLayout(150, 0, 1234, 5678)

    expect(shortCounts.barWidth).toBe(80)
    expect(longCounts.barWidth).toBeLessThan(shortCounts.barWidth)
    expect(longCounts.variantCountX).toBe(shortCounts.variantCountX)
  })
})
