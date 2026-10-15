import { LongReadTrRepresentedLength } from './types'

const BASES = /^[ACGTN]+$/i

/**
 * Whether the API confirmed that every source REF and ALT of the locus starts
 * with the same VCF padding base, so that base can be dropped. When it could
 * not, the represented length is unavailable or unreconciled, for example with
 * reason SHARED_PADDING_BASE_NOT_VALIDATED.
 */
export const sharedPaddingBaseValidated = (
  representedLength: LongReadTrRepresentedLength | null | undefined
) =>
  representedLength?.status === 'AVAILABLE_EXACT' &&
  representedLength.reconciliation_status === 'RECONCILED' &&
  representedLength.anchor_rule === 'VCF_SHARED_LEFT_PADDING_BASE_V1'

/**
 * Drops the VCF padding base that a source REF carries ahead of the repeat, so
 * what remains is the reference sequence of the repeat interval itself. Returns
 * null unless that base was validated as a shared padding base
 * (sharedPaddingBaseValidated), since otherwise it may be part of the repeat.
 */
export const referenceRepeatSequence = (
  ref: string | null | undefined,
  paddingValidated: boolean
): string | null => (paddingValidated && ref && ref.length > 1 ? ref.slice(1) : null)

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
