import { describe, expect, test } from '@jest/globals'

import {
  escapeCsvValue,
  formatCsvExportTimestamp,
  getCsvExportFileName,
  serializeTableToCsv,
} from './exportTableToCsv'

describe('serializeTableToCsv', () => {
  test('preserves column order and CRLF row separators', () => {
    const csv = serializeTableToCsv(
      [
        { id: 'first', value: '1' },
        { id: 'second', value: '2' },
      ],
      [
        { label: 'ID', getValue: (row) => row.id },
        { label: 'Value', getValue: (row) => row.value },
      ]
    )

    expect(csv).toBe('ID,Value\r\nfirst,1\r\nsecond,2\r\n')
  })

  test('preserves the existing empty-row output', () => {
    const csv = serializeTableToCsv([], [{ label: 'Variant ID', getValue: () => '' }])

    expect(csv).toBe('Variant ID\r\n\r\n')
  })

  test('preserves the existing newline-only value behavior', () => {
    const csv = serializeTableToCsv(
      [{ value: 'first line\nsecond line' }],
      [{ label: 'Value', getValue: (row) => row.value }]
    )

    expect(csv).toBe('Value\r\nfirst line\nsecond line\r\n')
  })
})

describe('escapeCsvValue', () => {
  test('quotes values containing commas, double quotes, or single quotes', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"')
    expect(escapeCsvValue('has "quote"')).toBe('"has ""quote""')
    expect(escapeCsvValue("has 'apostrophe'")).toBe('"has \'apostrophe\'"')
  })

  test('leaves values without legacy trigger characters unquoted', () => {
    expect(escapeCsvValue('plain value')).toBe('plain value')
  })
})

describe('CSV export filenames', () => {
  test('formats timestamps and replaces whitespace in the base filename', () => {
    const date = new Date(2026, 4, 13, 7, 8, 9)

    expect(formatCsvExportTimestamp(date)).toBe('2026_05_13_07_08_09')
    expect(getCsvExportFileName('gene page variants', date)).toBe(
      'gene_page_variants_2026_05_13_07_08_09.csv'
    )
  })
})
