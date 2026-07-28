import { describe, expect, test } from '@jest/globals'
import { formatLongReadFrequency, nullableLongReadFrequency } from './longReadFrequency'

describe('long-read nullable frequency mapping', () => {
  test('preserves an API-supplied numeric zero', () => {
    expect(nullableLongReadFrequency({ ac: 0, an: 0, af: 0 })).toEqual({ ac: 0, an: 0, af: 0 })
    expect(formatLongReadFrequency(0, 4)).toBe('0.0000')
  })

  test('renders null and omitted measurements as unavailable', () => {
    expect(nullableLongReadFrequency(null)).toEqual({ ac: null, an: null, af: null })
    expect(nullableLongReadFrequency({ ac: null })).toEqual({ ac: null, an: null, af: null })
    expect(formatLongReadFrequency(null)).toBe('—')
    expect(formatLongReadFrequency(undefined)).toBe('—')
  })
})
