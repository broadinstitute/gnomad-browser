import { getElementScrollbarGutter } from './scrollbarGutter'

describe('getElementScrollbarGutter', () => {
  test.each([
    [1000, 985, 15],
    [1000, 988, 12],
    [1000, 1000, 0],
  ])('uses the element content boundary for a %ipx box with a %ipx client width', (offsetWidth, clientWidth, expected) => {
    expect(getElementScrollbarGutter({ offsetWidth, clientWidth } as HTMLElement)).toBe(expected)
  })
})
