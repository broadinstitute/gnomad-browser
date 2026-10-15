import {
  longestPureMotifRun,
  referenceRepeatSequence,
  sharedPaddingBaseValidated,
} from './referenceSequencePurity'
import { LongReadTrRepresentedLength } from './types'

describe('referenceRepeatSequence', () => {
  test('drops the shared padding base', () => {
    expect(referenceRepeatSequence('AGTCCCTGTCCCT', true)).toBe('GTCCCTGTCCCT')
  })

  test('does not drop a first base that was not validated as shared padding', () => {
    expect(referenceRepeatSequence('AGTCCCTGTCCCT', false)).toBeNull()
  })

  test.each([
    ['a missing REF', null],
    ['an absent REF', undefined],
    ['an empty REF', ''],
    ['a REF that is only the padding base', 'A'],
  ])('returns null for %s', (_description, ref) => {
    expect(referenceRepeatSequence(ref, true)).toBeNull()
  })
})

describe('sharedPaddingBaseValidated', () => {
  const validated = {
    status: 'AVAILABLE_EXACT' as const,
    reconciliation_status: 'RECONCILED' as const,
    anchor_rule: 'VCF_SHARED_LEFT_PADDING_BASE_V1' as const,
  } as LongReadTrRepresentedLength

  test('accepts a reconciled exact length with the shared padding rule', () => {
    expect(sharedPaddingBaseValidated(validated)).toBe(true)
  })

  test.each([
    ['an unavailable length', { ...validated, status: 'UNAVAILABLE' as const }],
    ['an unreconciled length', { ...validated, reconciliation_status: 'NOT_RECONCILED' as const }],
    ['no padding rule', { ...validated, anchor_rule: null }],
  ])('rejects %s', (_description, representedLength) => {
    expect(sharedPaddingBaseValidated(representedLength as LongReadTrRepresentedLength)).toBe(false)
  })

  test('rejects a missing represented length', () => {
    expect(sharedPaddingBaseValidated(undefined)).toBe(false)
  })
})

describe('longestPureMotifRun', () => {
  test('counts every copy of a pure repeat', () => {
    expect(longestPureMotifRun('TTCTTTCTTTCTTTCTTTCT', 'TTCT')).toBe(5)
  })

  test('takes the longest uninterrupted run, not the total copy count', () => {
    // Three copies, an interruption, then two copies: five in all, three in a row.
    expect(longestPureMotifRun('CAGCAGCAGCAACAGCAG', 'CAG')).toBe(3)
  })

  test('finds a run that starts at any offset, ignoring flanking bases', () => {
    expect(longestPureMotifRun('GTCAGCAGCAGT', 'CAG')).toBe(3)
  })

  test('is case-insensitive', () => {
    expect(longestPureMotifRun('cagcag', 'CAG')).toBe(2)
  })

  test('is 0 when the motif never occurs', () => {
    expect(longestPureMotifRun('TTTTTT', 'CAG')).toBe(0)
  })

  test.each([
    ['a missing sequence', null, 'CAG'],
    ['a missing motif', 'CAGCAG', null],
    ['a non-sequence motif', 'CAGCAG', 'N/A'],
  ])('returns null for %s', (_description, sequence, motif) => {
    expect(longestPureMotifRun(sequence, motif)).toBeNull()
  })
})
