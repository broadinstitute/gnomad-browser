import { describe, expect, test } from '@jest/globals'
import { classifyCopySupport, classifyPopulationSupport } from './methylationSupport'
import type { MethylationSummaryPoint } from './methylationTypes'

const site = (mean_coverage: number, num_samples: number): MethylationSummaryPoint => ({
  chrom: 'chr22',
  pos1: 1,
  pos2: 2,
  mean_methylation: 50,
  mean_coverage,
  num_samples,
})
const copy = (medianDepth: number, representedSites = 10, totalSites = 10, sampleCount = 20) => ({
  medianDepth,
  representedSites,
  totalSites,
  sampleCount,
})

describe('methylation display support', () => {
  test('classifies adequate, depth-limited, sample-limited, and combined site support', () => {
    expect(classifyPopulationSupport(site(20, 100)).state).toBe('adequate')
    expect(classifyPopulationSupport(site(4, 100)).state).toBe('limited-depth')
    expect(classifyPopulationSupport(site(20, 4)).state).toBe('limited-samples')
    expect(classifyPopulationSupport(site(4, 4)).state).toBe('limited-depth-and-samples')
    expect(classifyPopulationSupport(site(4, 4)).reasons.join(' ')).toContain('4.0×')
    expect(classifyPopulationSupport(site(4, 4)).reasons.join(' ')).toContain(
      '4 observed sample totals'
    )
  })

  test('does not render a missing population mean as a zero-valued state', () => {
    expect(
      classifyPopulationSupport({ ...site(20, 100), mean_methylation: Number.NaN }).state
    ).toBe('missing')
  })

  test('classifies balanced, uneven, low, missing, and unavailable Copy A/B support', () => {
    expect(classifyCopySupport(copy(20), copy(10)).state).toBe('balanced-enough')
    expect(classifyCopySupport(copy(20), copy(4)).state).toBe('one-copy-limited')
    expect(classifyCopySupport(copy(25), copy(5)).state).toBe('uneven')
    expect(classifyCopySupport(copy(20), null).state).toBe('missing')
    expect(classifyCopySupport(copy(20), copy(20), false).state).toBe('unavailable')
  })
  ;(
    [
      [2, 'balanced-enough'],
      [5, 'uneven'],
      [20, 'uneven'],
    ] as Array<[number, 'balanced-enough' | 'uneven']>
  ).forEach(([ratio, expected]) => {
    test(`${ratio}:1 depth ratio has expected display state`, () => {
      const result = classifyCopySupport(copy(10 * ratio), copy(10))
      expect(result.state).toBe(expected)
      expect(result.reasons.join(' ')).toContain(`${ratio.toFixed(1)}:1`)
    })
  })

  test('marks unequal represented-site counts as one-copy-limited with observed values', () => {
    const result = classifyCopySupport(copy(20, 10, 10), copy(20, 2, 10))
    expect(result.state).toBe('one-copy-limited')
    expect(result.reasons.join(' ')).toContain('2/10 CpGs')
  })

  test('uses both copies contributing-sample counts in site support and reasons', () => {
    const result = classifyCopySupport(copy(20, 1, 1, 20), copy(20, 1, 1, 1))
    expect(result.state).toBe('uneven')
    expect(result.reasons.join(' ')).toContain('Copy A')
    expect(result.reasons.join(' ')).toContain('20 contributing samples')
    expect(result.reasons.join(' ')).toContain('Copy B')
    expect(result.reasons.join(' ')).toContain('1 contributing sample')
    expect(result.reasons.join(' ')).toContain('20.0:1')
  })
})
