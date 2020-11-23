import { regionIntersections } from './RegionalConstraintTrack'

describe('RegionalConstraintTrack', () => {
  test('regionIntersections', () => {
    const testCases = [
      {
        regions1: [
          { start: 2, stop: 4, i: 1 },
          { start: 6, stop: 8, i: 2 },
        ],
        regions2: [
          { start: 2, stop: 6, j: 1 },
          { start: 6, stop: 9, j: 2 },
        ],
        expected: [
          { start: 2, stop: 4, i: 1, j: 1 },
          { start: 6, stop: 8, i: 2, j: 2 },
        ],
      },
      {
        regions1: [
          { start: 2, stop: 4, i: 1 },
          { start: 6, stop: 8, i: 2 },
        ],
        regions2: [{ start: 1, stop: 8, j: 1 }],
        expected: [
          { start: 2, stop: 4, i: 1, j: 1 },
          { start: 6, stop: 8, i: 2, j: 1 },
        ],
      },
      {
        regions1: [
          { start: 2, stop: 4, i: 1 },
          { start: 6, stop: 8, i: 2 },
        ],
        regions2: [
          { start: 1, stop: 3, j: 1 },
          { start: 3, stop: 5, j: 2 },
          { start: 5, stop: 9, j: 3 },
        ],
        expected: [
          { start: 2, stop: 3, i: 1, j: 1 },
          { start: 3, stop: 4, i: 1, j: 2 },
          { start: 6, stop: 8, i: 2, j: 3 },
        ],
      },
    ]

    testCases.forEach(({ regions1, regions2, expected }) => {
      expect(regionIntersections([regions1, regions2])).toEqual(expected)
    })
  })
})
