import { describe, test, expect } from '@jest/globals'
import { decomposeSequence, refineDecompositions } from './trvizDecomposition'
import type { SequenceToken, DecomposeResult } from './trvizDecomposition'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count tokens by type */
const countTypes = (tokens: SequenceToken[]) => ({
  motif: tokens.filter((t) => t.type === 'motif').length,
  interruption: tokens.filter((t) => t.type === 'interruption').length,
})

/** Concatenate all token sequences — should reconstruct the input */
const reconstruct = (tokens: SequenceToken[]) =>
  tokens.map((t) => t.sequence).join('')

/** Check that decomposition covers the entire input without losing bases */
const expectFullCoverage = (result: DecomposeResult, input: string) => {
  expect(reconstruct(result.tokens)).toBe(input)
}

// ---------------------------------------------------------------------------
// 1. Homopolymer (single-character) motifs
// ---------------------------------------------------------------------------

describe('homopolymer motifs (1-char)', () => {
  test('pure C homopolymer uses greedy fast-path', () => {
    const r = decomposeSequence('CCCCCCCCCCCC', ['C'])
    expect(r.algorithm).toBe('greedy')
    expect(r.tokens).toHaveLength(12)
    expect(r.tokens.every((t) => t.type === 'motif')).toBe(true)
    expectFullCoverage(r, 'CCCCCCCCCCCC')
  })

  test('C homopolymer with terminal mismatch (G)', () => {
    const r = decomposeSequence('CCCCCCCCCCCG', ['C'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBe(12)
    // First 11 should be C, last should be G (mismatch aligned to motif)
    expect(r.tokens.slice(0, 11).every((t) => t.sequence === 'C')).toBe(true)
    expect(r.tokens[11].sequence).toBe('G')
    expectFullCoverage(r, 'CCCCCCCCCCCG')
  })

  test('C homopolymer with internal mismatch', () => {
    const r = decomposeSequence('CCCCCCGCCCCA', ['C'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBe(12)
    // Mismatches at positions 6 (G) and 11 (A)
    expect(r.tokens[6].sequence).toBe('G')
    expect(r.tokens[11].sequence).toBe('A')
    expectFullCoverage(r, 'CCCCCCGCCCCA')
  })

  test('pure A homopolymer (13bp)', () => {
    const r = decomposeSequence('AAAAAAAAAAAAA', ['A'])
    expect(r.algorithm).toBe('greedy')
    expect(r.tokens).toHaveLength(13)
    expectFullCoverage(r, 'AAAAAAAAAAAAA')
  })

  test('T homopolymer with single substitution', () => {
    // Inspired by 22-20684181-TRV-14: motif=T, with a mismatch
    const r = decomposeSequence('TTTTTTTTTTTGT', ['T'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBe(13)
    expect(r.tokens[11].sequence).toBe('G')
    expectFullCoverage(r, 'TTTTTTTTTTTGT')
  })
})

// ---------------------------------------------------------------------------
// 2. Dinucleotide repeats (2bp motifs)
// ---------------------------------------------------------------------------

describe('dinucleotide repeats', () => {
  test('pure CA repeat', () => {
    const r = decomposeSequence('CACACACACACA', ['CA'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 6, interruption: 0 })
    expectFullCoverage(r, 'CACACACACACA')
  })

  test('CA repeat with C→G interruption (real: 22-20666343)', () => {
    // ref: CACACACACACA, alt: CACAGACACACA — C→G at position 4
    const r = decomposeSequence('CACAGACACACA', ['CA'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBeGreaterThan(1)
    expectFullCoverage(r, 'CACAGACACACA')
  })

  test('GA repeat pure (even length)', () => {
    const r = decomposeSequence('GAGAGAGAGAGA', ['GA'])
    expect(r.algorithm).toBe('greedy')
    // GAGAGAGAGAGA is 12 chars = 6 x GA, no remainder
    expect(countTypes(r.tokens)).toEqual({ motif: 6, interruption: 0 })
    expectFullCoverage(r, 'GAGAGAGAGAGA')
  })

  test('GA repeat with trailing base', () => {
    const r = decomposeSequence('GAGAGAGAGAG', ['GA'])
    expect(r.algorithm).toBe('dp')
    // 11 chars: 5 x GA + trailing G
    expectFullCoverage(r, 'GAGAGAGAGAG')
  })

  test('CA repeat with insertion disruption (real: 22-20390709)', () => {
    // CACACACACACCACA — insertion disrupts pattern
    const r = decomposeSequence('CACACACACACCACA', ['CA'])
    expect(r.algorithm).toBe('dp')
    expectFullCoverage(r, 'CACACACACACCACA')
  })
})

// ---------------------------------------------------------------------------
// 3. Trinucleotide repeats (disease-relevant)
// ---------------------------------------------------------------------------

describe('trinucleotide repeats', () => {
  test('pure CAG repeat', () => {
    const r = decomposeSequence('CAGCAGCAGCAGCAG', ['CAG'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 5, interruption: 0 })
    expectFullCoverage(r, 'CAGCAGCAGCAGCAG')
  })

  test('CAG with point mutation (real: 22-20314481)', () => {
    // CGGCAGCAG — A→G substitution in first repeat
    const r = decomposeSequence('CGGCAGCAG', ['CAG'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBeGreaterThanOrEqual(3)
    // First token should be the impure copy, classified as motif (edit dist 1)
    expect(r.tokens[0].type).toBe('motif')
    expect(r.tokens[0].sequence).toBe('CGG')
    expectFullCoverage(r, 'CGGCAGCAG')
  })

  test('CAA pure contraction', () => {
    const r = decomposeSequence('CAACAACAACAA', ['CAA'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 4, interruption: 0 })
    expectFullCoverage(r, 'CAACAACAACAA')
  })

  test('CAG repeat with many interruptions (real: 22-20702839)', () => {
    // GCAGGAGCAGCACAGCAGGCAGCTGCAG — GAG, CAC, GCT between CAG units
    const r = decomposeSequence('GCAGGAGCAGCACAGCAGGCAGCTGCAG', ['CAG'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBeGreaterThan(1)
    expectFullCoverage(r, 'GCAGGAGCAGCACAGCAGGCAGCTGCAG')
  })
})

// ---------------------------------------------------------------------------
// 4. Medium motifs (4-6bp)
// ---------------------------------------------------------------------------

describe('medium motifs (4-6bp)', () => {
  test('pure AAAG repeat', () => {
    const r = decomposeSequence('AAAGAAAGAAAGAAAG', ['AAAG'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 4, interruption: 0 })
    expectFullCoverage(r, 'AAAGAAAGAAAGAAAG')
  })

  test('AAAG with single base substitution', () => {
    const r = decomposeSequence('AAAGAAGGAAAG', ['AAAG'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens).toHaveLength(3)
    expect(r.tokens[1].sequence).toBe('AAGG')
    expect(r.tokens[1].type).toBe('motif') // edit dist 1 < threshold 2
    expectFullCoverage(r, 'AAAGAAGGAAAG')
  })

  test('AAAC with C→G substitution (real: 22-20404940)', () => {
    // AAACAAACAAACAAAGAAA — last repeat has C→G
    const r = decomposeSequence('AAACAAACAAACAAAGAAA', ['AAAC'])
    expect(r.algorithm).toBe('dp')
    expectFullCoverage(r, 'AAACAAACAAACAAAGAAA')
  })

  test('TTTTG pure repeat (real: 22-20449040)', () => {
    const r = decomposeSequence('TTTTGTTTTGTTTTGTTTTGTTTTG', ['TTTTG'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 5, interruption: 0 })
    expectFullCoverage(r, 'TTTTGTTTTGTTTTGTTTTGTTTTG')
  })

  test('GGGGCA with impurity (real: 22-20150352)', () => {
    // 4xGGGGCA with T instead of A in one copy
    const r = decomposeSequence('GGGGCAGGGGCAGGGGCTGGGGCA', ['GGGGCA'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBe(4)
    // The impure copy should still be classified as motif (edit dist 1)
    expect(r.tokens[2].sequence).toBe('GGGGCT')
    expect(r.tokens[2].type).toBe('motif')
    expectFullCoverage(r, 'GGGGCAGGGGCAGGGGCTGGGGCA')
  })
})

// ---------------------------------------------------------------------------
// 5. Multi-motif loci
// ---------------------------------------------------------------------------

describe('multi-motif loci', () => {
  test('GGAAAG + AG motifs', () => {
    const r = decomposeSequence('GGAAAGGGAAAGAG', ['GGAAAG', 'AG'])
    expect(r.tokens).toHaveLength(3)
    expect(r.tokens[0].type).toBe('motif')
    expect(r.tokens[0].sequence).toBe('GGAAAG')
    expect(r.tokens[2].type).toBe('motif')
    expect(r.tokens[2].sequence).toBe('AG')
    expectFullCoverage(r, 'GGAAAGGGAAAGAG')
  })

  test('GGAAAG + AG with impure copy', () => {
    const r = decomposeSequence('GGAAAGGGATAGAGE', ['GGAAAG', 'AG'])
    expect(r.algorithm).toBe('dp')
    expectFullCoverage(r, 'GGAAAGGGATAGAGE')
  })

  test('CA + AT mixed repeat fully covered by greedy (real: 22-20322291)', () => {
    // CA and AT together tile CACAATATCACACAATATCA perfectly
    const r = decomposeSequence('CACAATATCACACAATATCA', ['CA', 'AT'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens).interruption).toBe(0)
    expectFullCoverage(r, 'CACAATATCACACAATATCA')
  })

  test('CA + AT with mismatch forces DP', () => {
    const r = decomposeSequence('CACAATATGACACAATATCA', ['CA', 'AT'])
    expect(r.algorithm).toBe('dp')
    expectFullCoverage(r, 'CACAATATGACACAATATCA')
  })

  test('GATG + ATGG motifs (real: 22-20470719)', () => {
    const r = decomposeSequence('GATGGATGGATGATGGATGGATG', ['GATG', 'ATGG'])
    expectFullCoverage(r, 'GATGGATGGATGATGGATGGATG')
  })
})

// ---------------------------------------------------------------------------
// 6. Long motifs (10+bp)
// ---------------------------------------------------------------------------

describe('long motifs', () => {
  test('25bp motif with single substitution (real: 22-20108775)', () => {
    const motif = 'GCCAGACCCTGGGCGCGCCTGCCTT'
    const seq = motif + motif.slice(0, 20) + 'A' + motif.slice(21)
    const r = decomposeSequence(seq, [motif])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens.length).toBe(2)
    expectFullCoverage(r, seq)
  })

  test('pure long motif repeat', () => {
    const motif = 'GCCAGACCCTGGGCGCGCCTGCCTT'
    const seq = motif + motif + motif
    const r = decomposeSequence(seq, [motif])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 3, interruption: 0 })
    expectFullCoverage(r, seq)
  })
})

// ---------------------------------------------------------------------------
// 7. Impure loci with low allele purity (real-world regression tests)
// ---------------------------------------------------------------------------

describe('impure loci with low allele purity', () => {
  test('GGCCAGG locus, allele purity 0.614 (real: 22-20226662)', () => {
    // This locus has heavily impure copies — most tokens should still be
    // classified as motif rather than interruption given the DP alignment.
    const r = decomposeSequence(
      'CTGCAGCTGTCTGGGGCCAGGCCCAGGCTGAGGGGCAGCTAGCAGGGTGCAGG',
      ['GGCCAGG']
    )
    expect(r.algorithm).toBe('dp')
    const { motif, interruption } = countTypes(r.tokens)
    // With purity ~0.614 on a 53bp seq (~7.6 copies), most should be motif
    expect(motif).toBeGreaterThanOrEqual(6)
    expect(interruption).toBeLessThanOrEqual(2)
    expectFullCoverage(r, 'CTGCAGCTGTCTGGGGCCAGGCCCAGGCTGAGGGGCAGCTAGCAGGGTGCAGG')
  })

  test('GGCCAGG locus shorter allele (real: 22-20226662)', () => {
    const r = decomposeSequence(
      'CAGCCTGGGGCCAGGCCCAGGCTGAGGGGCAGCTAGCAGGGTGCAGG',
      ['GGCCAGG']
    )
    expect(r.algorithm).toBe('dp')
    expect(countTypes(r.tokens).motif).toBeGreaterThanOrEqual(5)
    expectFullCoverage(r, 'CAGCCTGGGGCCAGGCCCAGGCTGAGGGGCAGCTAGCAGGGTGCAGG')
  })

  test('CAG with heavy interruptions (real: 22-20702839)', () => {
    // GCAGGAGCAGCACAGCAGGCAGCTGCAG — interleaved GAG, CAC, GCT
    const r = decomposeSequence('GCAGGAGCAGCACAGCAGGCAGCTGCAG', ['CAG'])
    expect(r.algorithm).toBe('dp')
    // Most 3-char segments should be within edit distance 2 of CAG
    expect(countTypes(r.tokens).motif).toBeGreaterThanOrEqual(5)
    expectFullCoverage(r, 'GCAGGAGCAGCACAGCAGGCAGCTGCAG')
  })
})

// ---------------------------------------------------------------------------
// 8. Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  test('empty sequence returns empty', () => {
    const r = decomposeSequence('', ['AAAG'])
    expect(r.tokens).toHaveLength(0)
  })

  test('empty motifs returns empty', () => {
    const r = decomposeSequence('AAAGAAAG', [])
    expect(r.tokens).toHaveLength(0)
  })

  test('sequence shorter than motif', () => {
    const r = decomposeSequence('AA', ['AAAG'])
    // Should still produce some output
    expect(r.tokens.length).toBeGreaterThanOrEqual(1)
    expectFullCoverage(r, 'AA')
  })

  test('sequence equals exactly one motif copy', () => {
    const r = decomposeSequence('AAAG', ['AAAG'])
    expect(r.algorithm).toBe('greedy')
    expect(r.tokens).toHaveLength(1)
    expect(r.tokens[0].type).toBe('motif')
    expectFullCoverage(r, 'AAAG')
  })

  test('completely non-matching sequence', () => {
    const r = decomposeSequence('TTTTTTTT', ['AAAG'])
    // Greedy produces all interruptions, DP may or may not improve
    expect(r.tokens.length).toBeGreaterThanOrEqual(1)
    expectFullCoverage(r, 'TTTTTTTT')
  })

  test('case insensitivity', () => {
    const r = decomposeSequence('aaagaaagaaag', ['AAAG'])
    expect(r.algorithm).toBe('greedy')
    expect(countTypes(r.tokens)).toEqual({ motif: 3, interruption: 0 })
    expectFullCoverage(r, 'aaagaaagaaag')
  })

  test('performance guard: sequences >10kb fall back to greedy', () => {
    const longSeq = 'AAAG'.repeat(3000) // 12000bp
    const r = decomposeSequence(longSeq, ['AAAG'])
    expect(r.algorithm).toBe('greedy')
    expect(r.tokens).toHaveLength(3000)
  })

  test('single base sequence with single base motif', () => {
    const r = decomposeSequence('C', ['C'])
    expect(r.tokens).toHaveLength(1)
    expect(r.tokens[0].type).toBe('motif')
    expectFullCoverage(r, 'C')
  })

  test('two-base sequence with single base motif and mismatch', () => {
    const r = decomposeSequence('CG', ['C'])
    expect(r.algorithm).toBe('dp')
    expect(r.tokens).toHaveLength(2)
    expectFullCoverage(r, 'CG')
  })
})

// ---------------------------------------------------------------------------
// 8. Full coverage invariant — decomposition always reconstructs input
// ---------------------------------------------------------------------------

describe('full coverage invariant', () => {
  const cases: [string, string[]][] = [
    ['CCCCCCCCCCCC', ['C']],
    ['CCCCCCCCCCCG', ['C']],
    ['CACACACACACA', ['CA']],
    ['CACAGACACACA', ['CA']],
    ['CAGCAGCAGCAGCAG', ['CAG']],
    ['CGGCAGCAG', ['CAG']],
    ['AAAGAAGGAAAG', ['AAAG']],
    ['GGAAAGGGAAAGAG', ['GGAAAG', 'AG']],
    ['GGAAAGGGATAGAGE', ['GGAAAG', 'AG']],
    ['GATGGATGGATGATGGATGGATG', ['GATG', 'ATGG']],
    ['CACAATATCACACAATATCA', ['CA', 'AT']],
    ['TTTTTTTT', ['AAAG']],
    ['AA', ['AAAG']],
    ['GCAGGAGCAGCACAGCAGGCAGCTGCAG', ['CAG']],
    ['AAACAAACAAACAAAGAAA', ['AAAC']],
    ['CACACACACACCACA', ['CA']],
  ]

  test.each(cases)(
    'reconstruct(%j, %j)',
    (seq, motifs) => {
      const r = decomposeSequence(seq, motifs)
      expectFullCoverage(r, seq)
    }
  )
})

// ---------------------------------------------------------------------------
// 9. Algorithm selection
// ---------------------------------------------------------------------------

describe('algorithm selection', () => {
  test('pure repeat → greedy', () => {
    expect(decomposeSequence('AAAGAAAGAAAG', ['AAAG']).algorithm).toBe('greedy')
  })

  test('impure repeat → dp', () => {
    expect(decomposeSequence('AAAGAAGGAAAG', ['AAAG']).algorithm).toBe('dp')
  })

  test('pure homopolymer → greedy', () => {
    expect(decomposeSequence('CCCCCCCC', ['C']).algorithm).toBe('greedy')
  })

  test('impure homopolymer → dp', () => {
    expect(decomposeSequence('CCCCGCCC', ['C']).algorithm).toBe('dp')
  })

  test('sequence >10kb → greedy regardless', () => {
    const seq = 'AAAG'.repeat(2600) + 'TTTT' // 10404bp, impure
    expect(decomposeSequence(seq, ['AAAG']).algorithm).toBe('greedy')
  })
})

// ---------------------------------------------------------------------------
// 10. Refine decompositions
// ---------------------------------------------------------------------------

describe('refineDecompositions', () => {
  test('identical decompositions are unchanged', () => {
    const tokens: SequenceToken[] = [
      { type: 'motif', motifIndex: 0, sequence: 'AAAG' },
      { type: 'motif', motifIndex: 0, sequence: 'AAAG' },
    ]
    const refined = refineDecompositions([tokens, tokens])
    expect(refined).toHaveLength(2)
    expect(refined[0]).toEqual(tokens)
  })

  test('normalizes boundary ambiguity to most common split', () => {
    // 3 alleles split as (AAA, GAA) and 1 as (AAAG, AA)
    // concatenation is the same: AAAGAA
    // The higher-frequency pair should win
    const common: SequenceToken[] = [
      { type: 'motif', motifIndex: 0, sequence: 'AAA' },
      { type: 'motif', motifIndex: 0, sequence: 'GAA' },
    ]
    const rare: SequenceToken[] = [
      { type: 'motif', motifIndex: 0, sequence: 'AAAG' },
      { type: 'motif', motifIndex: 0, sequence: 'AA' },
    ]
    const refined = refineDecompositions([common, common, common, rare])
    // The rare pair should be normalized to the common pair
    expect(refined[3][0].sequence).toBe('AAA')
    expect(refined[3][1].sequence).toBe('GAA')
  })

  test('single allele is unchanged', () => {
    const tokens: SequenceToken[] = [
      { type: 'motif', motifIndex: 0, sequence: 'CAG' },
      { type: 'motif', motifIndex: 0, sequence: 'CAG' },
      { type: 'motif', motifIndex: 0, sequence: 'CAG' },
    ]
    const refined = refineDecompositions([tokens])
    expect(refined[0]).toEqual(tokens)
  })

  test('empty input returns empty', () => {
    expect(refineDecompositions([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 11. Motif index tracking
// ---------------------------------------------------------------------------

describe('motif index tracking', () => {
  test('single motif: all tokens get index 0', () => {
    const r = decomposeSequence('AAAGAAAGAAAG', ['AAAG'])
    r.tokens.forEach((t) => {
      if (t.type === 'motif') {
        expect(t.motifIndex).toBe(0)
      }
    })
  })

  test('multi-motif: correct indices assigned', () => {
    const r = decomposeSequence('GGAAAGGGAAAGAG', ['GGAAAG', 'AG'])
    const motifTokens = r.tokens.filter((t) => t.type === 'motif')
    // First two are GGAAAG (index 0), last is AG (index 1)
    expect(motifTokens[0].motifIndex).toBe(0)
    expect(motifTokens[1].motifIndex).toBe(0)
    expect(motifTokens[2].motifIndex).toBe(1)
  })

  test('DP preserves motif index for impure copies', () => {
    const r = decomposeSequence('AAAGAAGGAAAG', ['AAAG'])
    // Middle token AAGG should be classified as motif 0 (1 edit from AAAG)
    expect(r.tokens[1].type).toBe('motif')
    if (r.tokens[1].type === 'motif') {
      expect(r.tokens[1].motifIndex).toBe(0)
    }
  })
})
