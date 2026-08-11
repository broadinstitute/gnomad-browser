import { describe, expect, test } from '@jest/globals'
import { clampRegionToOverview, zoomRegionWithinOverview } from './zoomRegion'

describe('client-side zoom regions', () => {
  const overview = { start: 1000, stop: 11000 }

  test('zooms around the current center without leaving loaded bounds', () => {
    expect(zoomRegionWithinOverview(overview, overview, 10)).toEqual({
      start: 5500,
      stop: 6500,
    })
    expect(zoomRegionWithinOverview({ start: 1000, stop: 2000 }, overview, 1 / 10))
      .toEqual(overview)
  })

  test('preserves the viewport span while clamping a pan at either boundary', () => {
    expect(clampRegionToOverview({ start: 500, stop: 2500 }, overview)).toEqual({
      start: 1000,
      stop: 3000,
    })
    expect(clampRegionToOverview({ start: 10000, stop: 12000 }, overview)).toEqual({
      start: 9000,
      stop: 11000,
    })
  })

  test('enforces a minimum zoom span without exceeding a small loaded region', () => {
    expect(zoomRegionWithinOverview({ start: 5900, stop: 6100 }, overview, 10)).toEqual({
      start: 5950,
      stop: 6050,
    })
    expect(zoomRegionWithinOverview(
      { start: 1000, stop: 1050 },
      { start: 1000, stop: 1050 },
      10
    )).toEqual({ start: 1000, stop: 1050 })
  })
})
