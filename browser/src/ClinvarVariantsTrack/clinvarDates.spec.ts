import { describe, expect, test } from '@jest/globals'
import {
  formatClinvarDate,
  clinvarReleaseDateSentence,
  clinvarReleaseDateClause,
} from './clinvarDates'

describe('formatClinvarDate', () => {
  test('formats a YYYY-MM-DD date string', () => {
    expect(formatClinvarDate('2023-03-01')).toBe('March 1, 2023')
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
  ] as [string, string | null | undefined][])(
    'returns null when the date is %s, instead of throwing',
    (_label, dateString) => {
      expect(formatClinvarDate(dateString)).toBeNull()
    }
  )
})

describe('clinvarReleaseDateSentence', () => {
  test('names the release date when one is available', () => {
    expect(clinvarReleaseDateSentence('2023-03-01')).toBe(
      "Data displayed here is from ClinVar's March 1, 2023 release."
    )
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
  ] as [string, string | null | undefined][])(
    'reports that the release date is unavailable, rather than throwing, when it is %s',
    (_label, releaseDate) => {
      expect(clinvarReleaseDateSentence(releaseDate)).toBe('ClinVar release date is unavailable.')
    }
  )
})

describe('clinvarReleaseDateClause', () => {
  test('names the release date when one is available', () => {
    expect(clinvarReleaseDateClause('2023-03-01')).toBe("Based on ClinVar's March 1, 2023 release")
  })

  test.each([
    ['null', null],
    ['undefined', undefined],
  ] as [string, string | null | undefined][])(
    'reports that the release date is unavailable, rather than throwing, when it is %s',
    (_label, releaseDate) => {
      expect(clinvarReleaseDateClause(releaseDate)).toBe('ClinVar release date is unavailable')
    }
  )
})
