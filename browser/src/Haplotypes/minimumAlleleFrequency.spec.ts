import {
  createMinimumAlleleFrequencyScale,
  minimumAlleleFrequencyOrDefault,
  parseMinimumAlleleFrequency,
} from './minimumAlleleFrequency'

describe('minimum allele frequency', () => {
  test('defaults missing URL state to zero and preserves explicit zero', () => {
    expect(parseMinimumAlleleFrequency(undefined)).toBe(0)
    expect(parseMinimumAlleleFrequency('0')).toBe(0)
  })

  test('does not replace explicit zero with a positive filter default', () => {
    expect(minimumAlleleFrequencyOrDefault(0, 0.01)).toBe(0)
    expect(minimumAlleleFrequencyOrDefault(undefined, 0.01)).toBe(0.01)
  })

  test('falls back to zero for invalid URL state', () => {
    expect(parseMinimumAlleleFrequency('not-a-number')).toBe(0)
    expect(parseMinimumAlleleFrequency('-0.1')).toBe(0)
  })

  test('keeps threshold scaling available for compatibility after UI control removal', () => {
    const scale = createMinimumAlleleFrequencyScale(0.002, 0.5)

    expect(scale.afToSlider(0)).toBe(0)
    expect(scale.sliderToAf(0)).toBe(0)
    expect(scale.sliderToAf(1)).toBeCloseTo(0.002)
    expect(scale.sliderToAf(100)).toBeCloseTo(0.5)
  })

  test('round-trips positive values on the existing logarithmic scale', () => {
    const scale = createMinimumAlleleFrequencyScale(0, 1)
    const sliderValue = scale.afToSlider(0.01)

    expect(sliderValue).toBeGreaterThan(1)
    expect(scale.sliderToAf(sliderValue)).toBeCloseTo(0.01)
  })
})
