import { decomposeSequence } from './trvizDecomposition'
import type { AlleleStructure } from './TrAlleleStructure'

export type ExactTrAltDecomposition =
  | {
      status: 'available'
      structure: AlleleStructure
      motifs: string[]
      flankPrefix: string
      flankSuffix: string
      sharedAnchorRemoved: boolean
    }
  | {
      status: 'unavailable'
      reason: 'missing_motifs' | 'missing_alt_sequence'
    }

const CONCRETE_DNA_SEQUENCE = /^[ACGTRYSWKMBDHVN]+$/i

export const normalizeTrMotifs = (motifs: readonly string[] | null | undefined) =>
  (motifs || []).map((motif) => motif.trim()).filter(Boolean)

export const repeatSequenceWithoutSharedAnchor = (ref: string, allele: string) =>
  allele.length > 1 && ref.length > 0 && allele[0].toUpperCase() === ref[0].toUpperCase()
    ? allele.slice(1)
    : allele

const referenceFlanks = (ref: string, motifs: string[]) => {
  const referenceRepeat = repeatSequenceWithoutSharedAnchor(ref, ref)
  if (!referenceRepeat) return { flankPrefix: '', flankSuffix: '' }

  const { tokens } = decomposeSequence(referenceRepeat, motifs)
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  return {
    flankPrefix: first?.type === 'interruption' ? first.sequence.slice(-5) : '',
    flankSuffix: last?.type === 'interruption' ? last.sequence.slice(0, 5) : '',
  }
}

/**
 * Decompose the exact selected TR ALT using the same trviz semantics as the
 * expanded haplotype-table grid. A shared VCF anchor base is excluded from the
 * repeat tract before decomposition.
 */
export const decomposeExactTrAlt = ({
  ref,
  alt,
  motifs: rawMotifs,
}: {
  ref: string
  alt: string
  motifs: readonly string[] | null | undefined
}): ExactTrAltDecomposition => {
  const motifs = normalizeTrMotifs(rawMotifs)
  if (motifs.length === 0) return { status: 'unavailable', reason: 'missing_motifs' }
  if (!alt || !CONCRETE_DNA_SEQUENCE.test(alt)) {
    return { status: 'unavailable', reason: 'missing_alt_sequence' }
  }

  const repeatSequence = repeatSequenceWithoutSharedAnchor(ref, alt)
  if (!repeatSequence) return { status: 'unavailable', reason: 'missing_alt_sequence' }

  const { tokens, algorithm } = decomposeSequence(repeatSequence, motifs)
  const interruptions = tokens.filter((token) => token.type === 'interruption')
  const sharedAnchorRemoved = repeatSequence.length !== alt.length

  return {
    status: 'available',
    structure: {
      sequence: repeatSequence,
      tokens,
      algorithm,
      totalMotifUnits: tokens.filter((token) => token.type === 'motif').length,
      interruptionCount: interruptions.length,
      interruptionBases: interruptions.reduce((total, token) => total + token.sequence.length, 0),
      popCounts: {},
      totalCarriers: 0,
    },
    motifs,
    ...referenceFlanks(ref, motifs),
    sharedAnchorRemoved,
  }
}
