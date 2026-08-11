import { describe, expect, test } from '@jest/globals'

import {
  decomposeExactTrAlt,
  normalizeTrMotifs,
  repeatSequenceWithoutSharedAnchor,
} from './trAlleleStructureData'

describe('exact tandem-repeat ALT decomposition', () => {
  test('uses the shared VCF anchor only as context and decomposes the selected ALT', () => {
    const result = decomposeExactTrAlt({
      ref: 'ATCCATCCA',
      alt: 'ATCCATCCATCCA',
      motifs: [' TCCA ', ''],
    })

    expect(result.status).toBe('available')
    if (result.status !== 'available') return

    expect(result.sharedAnchorRemoved).toBe(true)
    expect(result.motifs).toEqual(['TCCA'])
    expect(result.structure.sequence).toBe('TCCATCCATCCA')
    expect(result.structure.tokens.map((token) => token.sequence).join('')).toBe(
      result.structure.sequence
    )
    expect(result.structure.totalMotifUnits).toBe(3)
    expect(result.structure.interruptionCount).toBe(0)
    expect(result.structure.totalCarriers).toBe(0)
  })

  test('does not remove a first base that is not a shared VCF anchor', () => {
    expect(repeatSequenceWithoutSharedAnchor('ACAG', 'TCAGCAG')).toBe('TCAGCAG')
  })

  test('normalizes motif data and fails closed when structure inputs are unavailable', () => {
    expect(normalizeTrMotifs([' CAG ', '', 'CCG'])).toEqual(['CAG', 'CCG'])
    expect(decomposeExactTrAlt({ ref: 'A', alt: 'ACAG', motifs: [] })).toEqual({
      status: 'unavailable',
      reason: 'missing_motifs',
    })
    expect(decomposeExactTrAlt({ ref: 'A', alt: '<TR>', motifs: ['CAG'] })).toEqual({
      status: 'unavailable',
      reason: 'missing_alt_sequence',
    })
  })
})
