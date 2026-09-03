export const MAX_EXACT_STORED_MOTIF_PREVIEW_SEQUENCE_BASES = 2_000
export const MAX_EXACT_STORED_MOTIF_PREVIEW_MOTIFS = 64
export const MAX_EXACT_STORED_MOTIF_PREVIEW_MOTIF_BASES = 1_000

export type ExactStoredMotifSegment =
  | { type: 'motif'; motifIndex: number; sequence: string }
  | { type: 'unmatched'; sequence: string }

export type ExactStoredMotifPreview =
  | {
      status: 'available'
      representedSequence: string
      sharedPaddingRemoved: boolean
      segments: ExactStoredMotifSegment[]
      occurrenceCounts: number[]
      matchedBases: number[]
      unmatchedBases: number
    }
  | {
      status: 'unavailable'
      reason: 'missing_sequence' | 'missing_motifs' | 'bound_exceeded' | 'invalid_shared_padding'
    }

/**
 * Find literal stored-motif strings in one exact source ALT.
 *
 * This intentionally does not call the permissive TRviz DP/RE decomposition. At each
 * sequence position, the longest literal motif wins; equal-length ties retain stored
 * vocabulary order. Motifs are not rotated, reverse-complemented, or interpreted as
 * IUPAC patterns. Unmatched bases are retained as neutral segments.
 */
export const exactStoredMotifPreview = ({
  ref,
  alt,
  motifs,
  excludeValidatedSharedPadding = false,
}: {
  ref: string
  alt: string
  motifs: readonly string[]
  excludeValidatedSharedPadding?: boolean
}): ExactStoredMotifPreview => {
  if (!ref || !alt) return { status: 'unavailable', reason: 'missing_sequence' }
  if (
    alt.length > MAX_EXACT_STORED_MOTIF_PREVIEW_SEQUENCE_BASES ||
    ref.length > MAX_EXACT_STORED_MOTIF_PREVIEW_SEQUENCE_BASES ||
    motifs.length > MAX_EXACT_STORED_MOTIF_PREVIEW_MOTIFS ||
    motifs.reduce((total, motif) => total + motif.length, 0) >
      MAX_EXACT_STORED_MOTIF_PREVIEW_MOTIF_BASES
  ) {
    return { status: 'unavailable', reason: 'bound_exceeded' }
  }
  if (motifs.length === 0 || motifs.some((motif) => motif.length === 0)) {
    return { status: 'unavailable', reason: 'missing_motifs' }
  }
  if (excludeValidatedSharedPadding && alt[0] !== ref[0]) {
    return { status: 'unavailable', reason: 'invalid_shared_padding' }
  }

  const representedSequence = excludeValidatedSharedPadding ? alt.slice(1) : alt
  const candidates = motifs
    .map((motif, motifIndex) => ({ motif, motifIndex }))
    .sort(
      (left, right) => right.motif.length - left.motif.length || left.motifIndex - right.motifIndex
    )
  const occurrenceCounts = motifs.map(() => 0)
  const matchedBases = motifs.map(() => 0)
  const segments: ExactStoredMotifSegment[] = []
  let unmatchedBases = 0
  let position = 0

  const appendUnmatched = (base: string) => {
    const previous = segments[segments.length - 1]
    if (previous?.type === 'unmatched') previous.sequence += base
    else segments.push({ type: 'unmatched', sequence: base })
    unmatchedBases += 1
  }

  while (position < representedSequence.length) {
    let match: (typeof candidates)[number] | undefined
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidate = candidates[candidateIndex]
      if (representedSequence.startsWith(candidate.motif, position)) {
        match = candidate
        break
      }
    }
    if (match) {
      segments.push({ type: 'motif', motifIndex: match.motifIndex, sequence: match.motif })
      occurrenceCounts[match.motifIndex] += 1
      matchedBases[match.motifIndex] += match.motif.length
      position += match.motif.length
    } else {
      appendUnmatched(representedSequence[position])
      position += 1
    }
  }

  return {
    status: 'available',
    representedSequence,
    sharedPaddingRemoved: excludeValidatedSharedPadding,
    segments,
    occurrenceCounts,
    matchedBases,
    unmatchedBases,
  }
}

const counted = (count: number, singular: string, plural: string) =>
  `${count.toLocaleString()} ${count === 1 ? singular : plural}`

export const exactStoredMotifCountSummary = (
  preview: Extract<ExactStoredMotifPreview, { status: 'available' }>,
  motifs: readonly string[]
) =>
  [
    ...motifs.map(
      (motif, motifIndex) =>
        `${motif}: ${counted(
          preview.occurrenceCounts[motifIndex],
          'exact occurrence',
          'exact occurrences'
        )} (${counted(preview.matchedBases[motifIndex], 'matched base', 'matched bases')})`
    ),
    `unmatched: ${counted(preview.unmatchedBases, 'base', 'bases')}`,
  ].join('; ')
