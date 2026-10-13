const BASES = /^[ACGTN]+$/i

/**
 * Drops the VCF padding base that a source REF carries ahead of the repeat. The
 * API validates that REF and ALT share it (SHARED_PADDING_BASE_NOT_VALIDATED),
 * so what remains is the reference sequence of the repeat interval itself.
 */
export const referenceRepeatSequence = (ref: string | null | undefined): string | null =>
  ref && ref.length > 1 ? ref.slice(1) : null

/**
 * Fraction of reference bases that match a pure repeat of the motif, phased to
 * the first base of the interval: Hamming distance expressed as agreement. A
 * partial final copy still counts, so a 32 bp interval of a 6 bp motif is scored
 * over all 32 bases rather than the 30 that make up whole copies.
 */
export const referenceSequencePurity = (
  referenceSequence: string | null | undefined,
  motif: string | null | undefined
): number | null => {
  if (!referenceSequence || !motif) return null
  if (!BASES.test(referenceSequence) || !BASES.test(motif)) return null
  const bases = Array.from(referenceSequence.toUpperCase())
  const unit = motif.toUpperCase()
  return bases.filter((base, index) => base === unit[index % unit.length]).length / bases.length
}

/**
 * Longest pure segment (LPS): the most consecutive exact copies of the motif found anywhere in
 * the sequence. This is the size trgt-lps assigns an allele, which the precomputed repeat-count
 * histograms are built from, so it places the REF on their axis.
 */
export const longestPureMotifRun = (
  sequence: string | null | undefined,
  motif: string | null | undefined
): number | null => {
  if (!sequence || !motif) return null
  if (!BASES.test(sequence) || !BASES.test(motif)) return null
  const bases = sequence.toUpperCase()
  const unit = motif.toUpperCase()
  let longestRun = 0
  for (let start = 0; start + unit.length <= bases.length; start += 1) {
    let copies = 0
    while (bases.startsWith(unit, start + copies * unit.length)) copies += 1
    longestRun = Math.max(longestRun, copies)
  }
  return longestRun
}
