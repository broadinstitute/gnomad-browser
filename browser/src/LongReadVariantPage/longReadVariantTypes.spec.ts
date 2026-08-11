import { describe, expect, test } from '@jest/globals'

import {
  filtersForLongReadVariantType,
  getLongReadVariantType,
  LONG_READ_VARIANT_TYPE_OPTIONS,
  passesHaplotypeVariantTypeAndSnvLodFilters,
  passesLongReadVariantTypeFilters,
  selectedLongReadVariantType,
} from './longReadVariantTypes'

const DATASET_ALLELE_TYPES = [
  'snv',
  'ins',
  'del',
  'dup',
  'dup_interspersed',
  'complex_dup',
  'inv_dup',
  'numt',
  'trv',
  'alu_ins',
  'line_ins',
  'sva_ins',
  'alu_del',
  'line_del',
  'sva_del',
]

describe('long-read variant type filters', () => {
  test('offers every supported display category with accessible labels', () => {
    expect(LONG_READ_VARIANT_TYPE_OPTIONS).toEqual([
      { id: 'all', label: 'All' },
      { id: 'snv', label: 'SNV' },
      { id: 'ins', label: 'INS' },
      { id: 'del', label: 'DEL' },
      { id: 'dup', label: 'DUP' },
      { id: 'tr', label: 'TR' },
      { id: 'inv', label: 'INV' },
      { id: 'mcnv', label: 'MCNV' },
      { id: 'cpx', label: 'CPX' },
      { id: 'oth', label: 'Other / BND / CTX' },
    ])
  })

  test('classifies every documented LR allele type', () => {
    expect(
      Object.fromEntries(DATASET_ALLELE_TYPES.map((type) => [type, getLongReadVariantType(type)]))
    ).toEqual({
      snv: 'snv',
      ins: 'ins',
      del: 'del',
      dup: 'dup',
      dup_interspersed: 'dup',
      complex_dup: 'cpx',
      inv_dup: 'cpx',
      numt: 'ins',
      trv: 'tr',
      alu_ins: 'ins',
      line_ins: 'ins',
      sva_ins: 'ins',
      alu_del: 'del',
      line_del: 'del',
      sva_del: 'del',
    })
  })

  test.each([
    ['SNP', 'snv'],
    [' SnV ', 'snv'],
    ['INV', 'inv'],
    ['cnv', 'mcnv'],
    ['MCNV', 'mcnv'],
    ['cpx', 'cpx'],
    ['BND', 'oth'],
    ['CTX', 'oth'],
    ['unknown_future_type', 'oth'],
  ])('normalizes supported browser/GraphQL alias %s to %s', (rawType, expected) => {
    expect(getLongReadVariantType(rawType)).toBe(expected)
  })

  test('legacy SNP payloads pass All and SNV selections but not nonselected types', () => {
    expect(passesLongReadVariantTypeFilters('SNP', filtersForLongReadVariantType('all'))).toBe(true)
    expect(passesLongReadVariantTypeFilters('SNP', filtersForLongReadVariantType('snv'))).toBe(true)
    expect(passesLongReadVariantTypeFilters('SNP', filtersForLongReadVariantType('del'))).toBe(false)
  })

  test('SNV selection retains SNP and snv haplotype marks past the normal SNV LOD', () => {
    const alleleTypes = ['SNP', 'snv', 'DEL']
    const visible = (selection: 'all' | 'snv') => alleleTypes.filter((alleleType) =>
      passesHaplotypeVariantTypeAndSnvLodFilters(
        alleleType, filtersForLongReadVariantType(selection), false
      )
    )

    expect(visible('all')).toEqual(['DEL'])
    expect(visible('snv')).toEqual(['SNP', 'snv'])
  })

  test('one shared selection filters summary and haplotype allele types identically', () => {
    const filters = filtersForLongReadVariantType('cpx')
    const summaryAlleleTypes = ['snv', 'complex_dup', 'inv_dup', 'dup', 'trv']
    const haplotypeAlleleTypes = ['SNP', 'CPX', 'complex_dup', 'DUP', 'TRV']

    expect(
      summaryAlleleTypes.filter((type) => passesLongReadVariantTypeFilters(type, filters))
    ).toEqual(['complex_dup', 'inv_dup'])
    expect(
      haplotypeAlleleTypes.filter((type) => passesLongReadVariantTypeFilters(type, filters))
    ).toEqual(['CPX', 'complex_dup'])
    expect(selectedLongReadVariantType(filters)).toBe('cpx')
    expect(selectedLongReadVariantType(filtersForLongReadVariantType('all'))).toBe('all')
  })
})
