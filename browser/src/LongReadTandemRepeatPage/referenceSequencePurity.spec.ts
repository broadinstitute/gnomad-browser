import { referenceRepeatSequence, referenceSequencePurity } from './referenceSequencePurity'

describe('referenceRepeatSequence', () => {
  test('drops the shared padding base', () => {
    expect(referenceRepeatSequence('AGTCCCTGTCCCT')).toBe('GTCCCTGTCCCT')
  })

  test.each([
    ['a missing REF', null],
    ['an absent REF', undefined],
    ['an empty REF', ''],
    ['a REF that is only the padding base', 'A'],
  ])('returns null for %s', (_description, ref) => {
    expect(referenceRepeatSequence(ref)).toBeNull()
  })
})

describe('referenceSequencePurity', () => {
  test('scores a pure repeat as 1', () => {
    expect(referenceSequencePurity('GTCCCTGTCCCTGTCCCT', 'GTCCCT')).toBe(1)
  })

  test('scores a partial trailing copy over every base it covers', () => {
    // 32 bases of a 6 bp motif: five whole copies plus GT.
    const sequence = `${'GTCCCT'.repeat(5)}GT`
    expect(sequence).toHaveLength(32)
    expect(referenceSequencePurity(sequence, 'GTCCCT')).toBe(1)
  })

  test('counts each mismatching base against the pure repeat', () => {
    // Two substitutions in 12 bases.
    expect(referenceSequencePurity('GTCCCTGACCCT', 'GTCCCT')).toBeCloseTo(11 / 12, 10)
    expect(referenceSequencePurity('ATCCCTGACCCT', 'GTCCCT')).toBeCloseTo(10 / 12, 10)
  })

  test('is phased to the first base, so a rotated interval scores below 1', () => {
    // A perfect repeat whose interval starts one base into the motif.
    expect(referenceSequencePurity('TCCCTGTCCCTG', 'GTCCCT')).toBeCloseTo(4 / 12, 10)
  })

  test('ignores case in both the sequence and the motif', () => {
    expect(referenceSequencePurity('gtccctGTCCCT', 'GtCcCt')).toBe(1)
  })

  test.each([
    ['a missing sequence', null, 'GTCCCT'],
    ['a missing motif', 'GTCCCT', null],
    ['an empty sequence', '', 'GTCCCT'],
    ['a symbolic sequence', '<INS>', 'GTCCCT'],
    ['a non-sequence motif', 'GTCCCT', 'N/A'],
  ])('returns null for %s', (_description, sequence, motif) => {
    expect(referenceSequencePurity(sequence, motif)).toBeNull()
  })
})
