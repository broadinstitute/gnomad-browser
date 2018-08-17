import { mergeOverlappingRegions } from './region'


describe('mergeOverlappingRegions', () => {
  it('should merge overlapping regions', () => {
    expect(mergeOverlappingRegions([
      { xstart: 5, xstop: 10 },
      { xstart: 7, xstop: 12 },
      { xstart: 10, xstop: 11 },
    ])).toEqual([
      { xstart: 5, xstop: 12 },
    ])
  })

  it('should merge adjacent regions', () => {
    expect(mergeOverlappingRegions([
      { xstart: 5, xstop: 10 },
      { xstart: 11, xstop: 14 },
      { xstart: 17, xstop: 22 },
      { xstart: 22, xstop: 24 },
    ])).toEqual([
      { xstart: 5, xstop: 14 },
      { xstart: 17, xstop: 24 },
    ])
  })

  it('should handle empty list', () => {
    expect(mergeOverlappingRegions([])).toEqual([])
  })
})
