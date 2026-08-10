import { accordionAxisIntervalCount } from './AccordionPositionAxis'

describe('accordion axis interval count', () => {
  test.each([
    [-100, 1],
    [0, 1],
    [89, 1],
    [180, 2],
    [5000, 10],
  ])('keeps array lengths valid for a %d px layout', (width, expected) => {
    expect(accordionAxisIntervalCount(width)).toBe(expected)
  })
})
