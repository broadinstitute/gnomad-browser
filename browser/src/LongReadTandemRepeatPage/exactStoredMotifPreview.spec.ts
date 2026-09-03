import {
  exactStoredMotifCountSummary,
  exactStoredMotifPreview,
  MAX_EXACT_STORED_MOTIF_PREVIEW_SEQUENCE_BASES,
} from './exactStoredMotifPreview'

const availablePreview = (input: Parameters<typeof exactStoredMotifPreview>[0]) => {
  const preview = exactStoredMotifPreview(input)
  expect(preview.status).toBe('available')
  if (preview.status !== 'available') throw new Error(preview.reason)
  return preview
}

describe('exact stored-motif string preview', () => {
  test('finds all five literal HTT motif strings in stored orientation', () => {
    const motifs = ['CAG', 'CAA', 'CCG', 'CCT', 'GCC']
    const preview = availablePreview({
      ref: 'ACAG',
      alt: 'ACAGCAGTCAACCGCCTGCC',
      motifs,
      excludeValidatedSharedPadding: true,
    })

    expect(preview.representedSequence).toBe('CAGCAGTCAACCGCCTGCC')
    expect(preview.occurrenceCounts).toEqual([2, 1, 1, 1, 1])
    expect(preview.matchedBases).toEqual([6, 3, 3, 3, 3])
    expect(preview.unmatchedBases).toBe(1)
    expect(preview.segments).toEqual([
      { type: 'motif', motifIndex: 0, sequence: 'CAG' },
      { type: 'motif', motifIndex: 0, sequence: 'CAG' },
      { type: 'unmatched', sequence: 'T' },
      { type: 'motif', motifIndex: 1, sequence: 'CAA' },
      { type: 'motif', motifIndex: 2, sequence: 'CCG' },
      { type: 'motif', motifIndex: 3, sequence: 'CCT' },
      { type: 'motif', motifIndex: 4, sequence: 'GCC' },
    ])
    expect(exactStoredMotifCountSummary(preview, motifs)).toBe(
      'CAG: 2 exact occurrences (6 matched bases); CAA: 1 exact occurrence (3 matched bases); CCG: 1 exact occurrence (3 matched bases); CCT: 1 exact occurrence (3 matched bases); GCC: 1 exact occurrence (3 matched bases); unmatched: 1 base'
    )
  })

  test('colors only literal TG occurrences in the chr16 four-TG ALT contract', () => {
    const alt =
      'TTCTGTGTGTGTGTGTGTGTGTGTGTGTGTGTAATTGTGTGTGTTTCTGTGTATGATTTTGTGTGTGTGATTATATGTCTGTGTGTGT'
    const preview = availablePreview({
      ref: 'T'.repeat(94),
      alt,
      motifs: ['TG'],
      excludeValidatedSharedPadding: true,
    })

    expect(preview.representedSequence).toBe(alt.slice(1))
    expect(preview.occurrenceCounts).toEqual([31])
    expect(preview.matchedBases).toEqual([62])
    expect(preview.unmatchedBases).toBe(25)
    const motifSegments = preview.segments.filter((segment) => segment.type === 'motif')
    expect(motifSegments).toHaveLength(31)
    expect(motifSegments.every((segment) => segment.sequence === 'TG')).toBe(true)
  })

  test('keeps the full GCA source ALT separate from the represented tract', () => {
    const alt = 'GGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCC'
    const preview = availablePreview({
      ref: 'GGCAGCAGCAGCAGCAGCAGCAGCAGCAGCA',
      alt,
      motifs: ['GCA'],
      excludeValidatedSharedPadding: true,
    })

    expect(alt).toHaveLength(43)
    expect(preview.representedSequence).toBe(alt.slice(1))
    expect(preview.representedSequence).toHaveLength(42)
    expect(preview.occurrenceCounts).toEqual([13])
    expect(preview.matchedBases).toEqual([39])
    expect(preview.unmatchedBases).toBe(3)
  })

  test('uses longest-first overlap resolution and stored order for equal-length ties', () => {
    const longest = availablePreview({ ref: 'A', alt: 'CAGCAG', motifs: ['CA', 'CAG'] })
    expect(longest.segments).toEqual([
      { type: 'motif', motifIndex: 1, sequence: 'CAG' },
      { type: 'motif', motifIndex: 1, sequence: 'CAG' },
    ])

    const equalLength = availablePreview({ ref: 'A', alt: 'CAG', motifs: ['CAG', 'CAG'] })
    expect(equalLength.occurrenceCounts).toEqual([1, 0])
  })

  test('treats non-ACGT motif characters literally and does not rotate or reverse-complement', () => {
    const preview = availablePreview({ ref: 'A', alt: 'NGCAGCCGN', motifs: ['NGC'] })
    expect(preview.occurrenceCounts).toEqual([1])
    expect(preview.matchedBases).toEqual([3])
    expect(preview.unmatchedBases).toBe(6)
  })

  test('retains every base as unmatched when no literal motif matches', () => {
    const preview = availablePreview({ ref: 'A', alt: 'CCCC', motifs: ['TG'] })
    expect(preview.occurrenceCounts).toEqual([0])
    expect(preview.matchedBases).toEqual([0])
    expect(preview.unmatchedBases).toBe(4)
    expect(preview.segments).toEqual([{ type: 'unmatched', sequence: 'CCCC' }])
  })

  test('handles the maximum bounded sequence without expanding unmatched bases into tokens', () => {
    const alt = `${'CAG'.repeat(666)}CC`
    expect(alt).toHaveLength(MAX_EXACT_STORED_MOTIF_PREVIEW_SEQUENCE_BASES)
    const preview = availablePreview({ ref: 'A', alt, motifs: ['CAG'] })
    expect(preview.occurrenceCounts).toEqual([666])
    expect(preview.unmatchedBases).toBe(2)
    expect(preview.segments).toHaveLength(667)

    expect(exactStoredMotifPreview({ ref: 'A', alt: `${alt}A`, motifs: ['CAG'] })).toEqual({
      status: 'unavailable',
      reason: 'bound_exceeded',
    })
  })

  test('removes a source padding base only when its validation is explicit and consistent', () => {
    expect(availablePreview({ ref: 'A', alt: 'ACAG', motifs: ['CAG'] }).representedSequence).toBe(
      'ACAG'
    )
    expect(
      availablePreview({
        ref: 'A',
        alt: 'ACAG',
        motifs: ['CAG'],
        excludeValidatedSharedPadding: true,
      }).representedSequence
    ).toBe('CAG')
    expect(
      exactStoredMotifPreview({
        ref: 'A',
        alt: 'TCAG',
        motifs: ['CAG'],
        excludeValidatedSharedPadding: true,
      })
    ).toEqual({ status: 'unavailable', reason: 'invalid_shared_padding' })
  })
})
