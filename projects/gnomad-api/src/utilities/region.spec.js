import { extendRegions, mergeOverlappingRegions, totalRegionSize } from './region'

describe('extendRegions', () => {
  it('should extend start/stop and xstart/xstop of regions', () => {
    expect(
      extendRegions(5, [
        { start: 20, stop: 30, xstart: 120, xstop: 130 },
        { start: 32, stop: 36, xstart: 132, xstop: 136 },
      ])
    ).toEqual([
      { start: 15, stop: 35, xstart: 115, xstop: 135 },
      { start: 27, stop: 41, xstart: 127, xstop: 141 },
    ])
  })
})

describe('mergeOverlappingRegions', () => {
  it('should merge overlapping regions', () => {
    expect(
      mergeOverlappingRegions([
        { xstart: 5, xstop: 10 },
        { xstart: 7, xstop: 12 },
        { xstart: 10, xstop: 11 },
      ])
    ).toEqual([{ xstart: 5, xstop: 12 }])
  })

  it('should merge adjacent regions', () => {
    expect(
      mergeOverlappingRegions([
        { xstart: 5, xstop: 10 },
        { xstart: 11, xstop: 14 },
        { xstart: 17, xstop: 22 },
        { xstart: 22, xstop: 24 },
      ])
    ).toEqual([{ xstart: 5, xstop: 14 }, { xstart: 17, xstop: 24 }])
  })

  it('should handle empty list', () => {
    expect(mergeOverlappingRegions([])).toEqual([])
  })
})

describe('totalRegionSize', () => {
  it('should return total size of all regions', () => {
    expect(
      totalRegionSize([{ start: 5, stop: 10 }, { start: 12, stop: 13 }, { start: 22, stop: 30 }])
    ).toBe(14)
  })
})
