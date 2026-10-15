import { describe, expect, test } from '@jest/globals'

import formatClinvarDate from './formatClinvarDate'

describe('formatClinvarDate', () => {
  test('formats a well-formed ClinVar date', () => {
    expect(formatClinvarDate('2023-06-17')).toEqual(
      new Intl.DateTimeFormat([], { dateStyle: 'long' }).format(new Date(2023, 5, 17))
    )
  })

  test.each([
    ['not-a-date'],
    [''],
    ['2023-06'],
    ['2023-06-17T00:00:00Z'],
    ['06-17-2023'],
    ['23-06-17'],
    ['x-06-17'],
    ['2023-00-17'],
    ['2023-13-01'],
    ['2023-17-00'],
    ['2023-01-00'],
    ['2023-01-37'],
    ['2023-02-29'],
    ['2023-04-31'],
  ])('rejects %p rather than rolling it over', (dateString) => {
    expect(formatClinvarDate(dateString)).toEqual(`Malformed date string: "${dateString}"`)
  })

  test('accepts a leap day in a leap year', () => {
    expect(formatClinvarDate('2024-02-29')).toEqual(
      new Intl.DateTimeFormat([], { dateStyle: 'long' }).format(new Date(2024, 1, 29))
    )
  })

  test('accepts unpadded month and day', () => {
    expect(formatClinvarDate('2023-6-17')).toEqual(formatClinvarDate('2023-06-17'))
  })
})
