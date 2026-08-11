import { describe, expect, test } from '@jest/globals'
import {
  filterLongReadVariantsForViewport,
  longReadVariantOverlapsViewport,
} from './longReadViewport'

describe('long-read graphical viewport projection', () => {
  const viewport = { start: 200, stop: 300 }

  test('keeps points inside the viewport and rejects offscreen points', () => {
    expect(longReadVariantOverlapsViewport({ pos: 250 }, viewport)).toBe(true)
    expect(longReadVariantOverlapsViewport({ pos: 150 }, viewport)).toBe(false)
    expect(longReadVariantOverlapsViewport({ pos: 350 }, viewport)).toBe(false)
  })

  test('keeps spanning deletions and reference intervals that overlap the viewport', () => {
    expect(longReadVariantOverlapsViewport({
      pos: 150,
      end: 225,
      allele_type: 'del',
    }, viewport)).toBe(true)
    expect(longReadVariantOverlapsViewport({
      pos: 150,
      length: -75,
      allele_type: 'del',
    }, viewport)).toBe(true)
    expect(longReadVariantOverlapsViewport({
      pos: 350,
      allele_type: 'trv',
      main_reference_region: { start: 275, stop: 375 },
    }, viewport)).toBe(true)
  })

  test('filters only the graphical projection and preserves the unzoomed array identity', () => {
    const variants = [{ pos: 150 }, { pos: 250 }, { pos: 350 }]
    expect(filterLongReadVariantsForViewport(variants, viewport)).toEqual([{ pos: 250 }])
    expect(filterLongReadVariantsForViewport(variants, null)).toBe(variants)
  })
})
