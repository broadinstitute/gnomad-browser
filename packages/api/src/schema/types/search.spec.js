import { isRegionId, isVariantId } from './search'

const test = (fn, positiveTestCases, negativeTestCases) => {
  positiveTestCases.forEach(query => {
    it(`should return true for "${query}"`, () => {
      expect(fn(query)).toBe(true)
    })
  })

  negativeTestCases.forEach(query => {
    it(`should return false for "${query}"`, () => {
      expect(fn(query)).toBe(false)
    })
  })
}

describe('isRegionId', () => {
  const positiveTestCases = [
    'chr1-13414',
    '1-15342343-15342563',
    '1:15342343-15342563',
    'CHR3-12433-19000',
    'chrX-23532-',
    '2-35324:',
    'y-712321-811232',
  ]

  const negativeTestCases = ['chr1-', '5-1243421-a', '3-356788-123245', '54-12432-15440']

  test(isRegionId, positiveTestCases, negativeTestCases)
})

describe('isVariantId', () => {
  const positiveTestCases = [
    'chr1-13414-a-c',
    'chr1:13414:a:c',
    '1-15342343-cagc-t',
    'CHR3-12433-A-GATC',
    'chrX-23532-cG',
    'y-712321-a-',
    'chr2-532434',
  ]

  const negativeTestCases = ['chr1-', '5-1243421-a-z', '6-1a1bc-a-gc', 'R-1242-A-T']

  test(isVariantId, positiveTestCases, negativeTestCases)
})
