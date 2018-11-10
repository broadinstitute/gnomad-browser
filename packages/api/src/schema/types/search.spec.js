import { isRegionId, normalizeRegionId, isVariantId, normalizeVariantId } from './search'

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
    '3:2592432',
    'chrX-23532-',
    '2-35324:',
    'y-712321-811232',
  ]

  const negativeTestCases = ['chr1-', '5-1243421-a', '3-356788-123245', '54-12432-15440']

  test(isRegionId, positiveTestCases, negativeTestCases)
})

describe('normalizeRegionId', () => {
  const testCases = [
    { input: 'chr1-13414', normalized: '1-13394-13434' },
    { input: '1-15342343-15342563', normalized: '1-15342343-15342563' },
    { input: '1:15342343-15342563', normalized: '1-15342343-15342563' },
    { input: 'CHR3-12433-19000', normalized: '3-12433-19000' },
    { input: '3:2592432', normalized: '3-2592412-2592452' },
    { input: 'chrX-23532-', normalized: 'X-23512-23552' },
    { input: '2-35324:', normalized: '2-35304-35344' },
    { input: 'y-712321-811232', normalized: 'Y-712321-811232' },
    { input: '3-10', normalized: '3-0-30' },
  ]

  testCases.forEach(({ input, normalized }) => {
    it(`should normalize ${input} to ${normalized}`, () => {
      expect(normalizeRegionId(input)).toBe(normalized)
    })
  })
})

describe('isVariantId', () => {
  const positiveTestCases = [
    'chr1-13414-a-c',
    'chr1:13414:a:c',
    '1-15342343-cagc-t',
    'CHR3-12433-A-GATC',
  ]

  const negativeTestCases = [
    'chr1-',
    'chr2-532434',
    '5-1243421-a-z',
    '6-1a1bc-a-gc',
    'R-1242-A-T',
    'chrX-23532-cG',
    'y-712321-a-',
  ]

  test(isVariantId, positiveTestCases, negativeTestCases)
})

describe('normalizeVariantId', () => {
  const testCases = [
    { input: 'chr1-13414-a-c', normalized: '1-13414-A-C' },
    { input: 'chr1:13414:a:c', normalized: '1-13414-A-C' },
    { input: '1-15342343-cagc-t', normalized: '1-15342343-CAGC-T' },
    { input: 'CHR3-12433-A-GATC', normalized: '3-12433-A-GATC' },
  ]

  testCases.forEach(({ input, normalized }) => {
    it(`should normalize ${input} to ${normalized}`, () => {
      expect(normalizeVariantId(input)).toBe(normalized)
    })
  })
})
