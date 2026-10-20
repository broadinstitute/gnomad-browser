import { describe, expect, test } from '@jest/globals'

import { colorForAverageGenotypeQuality } from './qualityDescription'

describe('colorForAverageGenotypeQuality', () => {
  test('uses the Low and High colors at the ends of the 1 to 5 scale', () => {
    expect(colorForAverageGenotypeQuality(1)).toEqual('rgb(215, 48, 39)')
    expect(colorForAverageGenotypeQuality(5)).toEqual('rgb(26, 152, 80)')
  })

  test('uses the exact color of a quality at its whole-number score', () => {
    expect(colorForAverageGenotypeQuality(2)).toEqual('rgb(252, 141, 89)')
  })

  test('blends the two adjacent quality colors in proportion to the score', () => {
    // 4.25 is 75% Medium-high (217, 239, 139) and 25% High (26, 152, 80)
    expect(colorForAverageGenotypeQuality(4.25)).toEqual('rgb(169, 217, 124)')
    // 1.5 is halfway between Low (215, 48, 39) and Medium-low (252, 141, 89)
    expect(colorForAverageGenotypeQuality(1.5)).toEqual('rgb(234, 95, 64)')
  })
})
