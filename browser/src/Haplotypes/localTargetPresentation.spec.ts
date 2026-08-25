import { localTargetBandBounds } from './localTargetPresentation'

describe('local tandem-repeat target presentation', () => {
  test('makes the motif display dominant without changing genomic coordinates', () => {
    expect(
      localTargetBandBounds({
        rawStart: 498,
        rawStop: 502,
        canvasWidth: 1_000,
        minimumBandFraction: 0.62,
      })
    ).toEqual({ bandLeft: 190, bandRight: 810 })
  })

  test('clamps a dominant target band at either canvas edge', () => {
    expect(
      localTargetBandBounds({
        rawStart: -10,
        rawStop: 10,
        canvasWidth: 500,
        minimumBandFraction: 0.6,
      })
    ).toEqual({ bandLeft: 0, bandRight: 300 })
    expect(
      localTargetBandBounds({
        rawStart: 490,
        rawStop: 510,
        canvasWidth: 500,
        minimumBandFraction: 0.6,
      })
    ).toEqual({ bandLeft: 200, bandRight: 500 })
  })
})
