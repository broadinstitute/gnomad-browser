import { abbreviateLongReadTableLabel } from './longReadTablePresentation'

describe('table label abbreviation', () => {
  test.each([0, 39, 40, 41, 100])('bounds %s code points', (length) => {
    const value = '🧬'.repeat(length)
    const label = abbreviateLongReadTableLabel(value)
    expect(Array.from(label)).toHaveLength(Math.min(length, 40))
    expect(label).toBe(length <= 40 ? value : `${'🧬'.repeat(27)}…${'🧬'.repeat(12)}`)
  })
})
