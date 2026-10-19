import { describe, expect, test } from '@jest/globals'

import { selectLinkedVariants } from './useLinkedVariantSelection'

const ids = (variants: { variant_id: string }[]) => variants.map((variant) => variant.variant_id)

describe('linked variant selection', () => {
  test('intersects exact allele IDs while preserving each input order', () => {
    const clinvar = [
      { variant_id: '1-200-A-C' },
      { variant_id: '1-100-A-C' },
      { variant_id: '1-300-A-C' },
    ]
    const gnomad = [
      { variant_id: '1-100-A-G' },
      { variant_id: '1-100-A-C' },
      { variant_id: '1-400-A-C' },
      { variant_id: '1-200-A-C' },
    ]
    const selected = selectLinkedVariants(clinvar, gnomad, true)
    expect(ids(selected.clinvar)).toEqual(['1-200-A-C', '1-100-A-C'])
    expect(ids(selected.gnomad)).toEqual(['1-100-A-C', '1-200-A-C'])
  })

  test('returns the original arrays when disabled', () => {
    const clinvar = [{ variant_id: 'clinvar-only' }]
    const gnomad = [{ variant_id: 'gnomad-only' }]
    const selected = selectLinkedVariants(clinvar, gnomad, false)
    expect(selected.clinvar).toBe(clinvar)
    expect(selected.gnomad).toBe(gnomad)
  })

  test('returns two empty lists when either input is empty', () => {
    const records = [{ variant_id: 'shared' }]
    expect(selectLinkedVariants([], records, true)).toEqual({ clinvar: [], gnomad: [] })
    expect(selectLinkedVariants(records, [], true)).toEqual({ clinvar: [], gnomad: [] })
  })

  test('retains the original records from both sections without mutating either input', () => {
    const clinvarRecord = Object.freeze({ variant_id: 'shared', payload: 'clinical annotation' })
    const gnomadRecord = Object.freeze({ variant_id: 'shared', payload: 'source-selected metrics' })
    const clinvarOnly = Object.freeze({ variant_id: 'clinvar-only', payload: 'unmatched' })
    const gnomadOnly = Object.freeze({ variant_id: 'gnomad-only', payload: 'unmatched' })
    const clinvar = [clinvarOnly, clinvarRecord]
    const gnomad = [gnomadRecord, gnomadOnly]
    const selected = selectLinkedVariants(clinvar, gnomad, true)
    expect(selected.clinvar[0]).toBe(clinvarRecord)
    expect(selected.gnomad[0]).toBe(gnomadRecord)
    expect(clinvar).toEqual([clinvarOnly, clinvarRecord])
    expect(gnomad).toEqual([gnomadRecord, gnomadOnly])
  })
})
