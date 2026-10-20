import { exactStoredMotifPreview } from './exactStoredMotifPreview'
import { longestPureMotifRun } from './referenceSequencePurity'
import {
  LongReadTrAllele,
  LongReadTrRepresentedLength,
  LongReadTrSequenceCardinality,
} from './types'

export type ExactStoredMotifDistributionBin = {
  // The most consecutive exact copies of the motif anywhere in the ALT, as in the precomputed
  // repeat-count histograms.
  longest_pure_run: number
  allele_copies: number
  allele_ids: string[]
}

export type ExactStoredMotifDistribution =
  | {
      status: 'available'
      motifs: {
        motif: string
        motif_index: number
        bins: ExactStoredMotifDistributionBin[]
      }[]
    }
  | {
      status: 'unavailable'
      reason:
        | 'incomplete_source_alt_identities'
        | 'incomplete_source_alt_sequences'
        | 'represented_length_contract_unavailable'
        | 'stored_motif_preview_unavailable'
        | 'invalid_frequency'
    }

const unavailable = (
  reason: Extract<ExactStoredMotifDistribution, { status: 'unavailable' }>['reason']
): ExactStoredMotifDistribution => ({ status: 'unavailable', reason })

const exactSourceAltIdentitiesAreComplete = (alleles: readonly LongReadTrAllele[]) => {
  const ids = new Set<string>()
  const allelesBySource = new Map<string, LongReadTrAllele[]>()
  const hasInvalidIdentity = alleles.some((allele) => {
    if (
      !allele.variant_id ||
      !allele.source_variant_id ||
      !Number.isInteger(allele.alt_index) ||
      allele.alt_index < 1 ||
      !Number.isInteger(allele.alt_count) ||
      allele.alt_count < 1 ||
      ids.has(allele.variant_id)
    ) {
      return true
    }
    ids.add(allele.variant_id)
    const sourceAlleles = allelesBySource.get(allele.source_variant_id) || []
    sourceAlleles.push(allele)
    allelesBySource.set(allele.source_variant_id, sourceAlleles)
    return false
  })
  if (hasInvalidIdentity) return false
  return [...allelesBySource.values()].every((sourceAlleles) => {
    const expectedCount = sourceAlleles[0].alt_count
    return (
      sourceAlleles.length === expectedCount &&
      sourceAlleles.every((allele) => allele.alt_count === expectedCount) &&
      new Set(sourceAlleles.map((allele) => allele.alt_index)).size === expectedCount &&
      sourceAlleles.every((allele) => allele.alt_index <= expectedCount)
    )
  })
}

const frequencyCount = (allele: LongReadTrAllele, selectedFrequencyId: string | null) =>
  selectedFrequencyId
    ? allele.freq.populations.find((frequency) => frequency.id === selectedFrequencyId)?.ac || 0
    : allele.freq.all.ac

/**
 * Build an ALT-only, identity-backed distribution of each motif's longest pure run (the most
 * consecutive exact copies) in the exact bounded source bytes, without the VCF padding base.
 *
 * Admission is all-or-nothing: every expected source ALT must have a unique, complete
 * identity and an available exactStoredMotifPreview under the reconciled shared-padding
 * contract. Bins are weighted by exact source ALT AC in the requested frequency slice;
 * zero-AC identities are not contributors in that slice.
 */
export const exactStoredMotifDistribution = ({
  alleles,
  motifs,
  sequenceCardinality,
  representedLength,
  exactAltCountComplete,
  selectedFrequencyId = null,
}: {
  alleles: readonly LongReadTrAllele[]
  motifs: readonly string[]
  sequenceCardinality?: LongReadTrSequenceCardinality
  representedLength?: LongReadTrRepresentedLength
  exactAltCountComplete: boolean
  selectedFrequencyId?: string | null
}): ExactStoredMotifDistribution => {
  if (
    !exactAltCountComplete ||
    alleles.length === 0 ||
    sequenceCardinality?.status !== 'AVAILABLE_EXACT' ||
    !sequenceCardinality.all_source_alts_sequence_complete ||
    sequenceCardinality.source_alt_identity_count !== alleles.length ||
    !exactSourceAltIdentitiesAreComplete(alleles)
  ) {
    return unavailable('incomplete_source_alt_identities')
  }
  if (alleles.some((allele) => !allele.ref || !allele.alt)) {
    return unavailable('incomplete_source_alt_sequences')
  }
  if (motifs.length === 0 || motifs.some((motif) => motif.length === 0)) {
    return unavailable('stored_motif_preview_unavailable')
  }
  if (
    representedLength?.status !== 'AVAILABLE_EXACT' ||
    representedLength.reconciliation_status !== 'RECONCILED' ||
    representedLength.anchor_rule !== 'VCF_SHARED_LEFT_PADDING_BASE_V1'
  ) {
    return unavailable('represented_length_contract_unavailable')
  }

  const weightedPreviews = alleles.map((allele) => ({
    allele,
    alleleCopies: frequencyCount(allele, selectedFrequencyId),
    preview: exactStoredMotifPreview({
      ref: allele.ref as string,
      alt: allele.alt as string,
      motifs,
      excludeValidatedSharedPadding: true,
    }),
  }))
  if (weightedPreviews.some(({ preview }) => preview.status !== 'available')) {
    return unavailable('stored_motif_preview_unavailable')
  }
  if (
    weightedPreviews.some(
      ({ alleleCopies }) =>
        !Number.isFinite(alleleCopies) || alleleCopies < 0 || !Number.isInteger(alleleCopies)
    )
  ) {
    return unavailable('invalid_frequency')
  }

  // Each ALT's longest pure run of each motif: 0 for an ALT that is only the padding base, and
  // null for a sequence or motif with characters other than bases.
  const longestPureRunsByAllele = weightedPreviews.map(({ preview }) =>
    motifs.map((motif) =>
      preview.status === 'available' && preview.representedSequence
        ? longestPureMotifRun(preview.representedSequence, motif)
        : 0
    )
  )
  if (longestPureRunsByAllele.some((runs) => runs.some((run) => run == null))) {
    return unavailable('stored_motif_preview_unavailable')
  }

  const binsByMotif = motifs.map(() => new Map<number, ExactStoredMotifDistributionBin>())
  weightedPreviews.forEach(({ allele, alleleCopies }, alleleIndex) => {
    if (alleleCopies > 0) {
      longestPureRunsByAllele[alleleIndex].forEach((longestPureRun, motifIndex) => {
        const bins = binsByMotif[motifIndex]
        const bin = bins.get(longestPureRun!) || {
          longest_pure_run: longestPureRun!,
          allele_copies: 0,
          allele_ids: [],
        }
        bin.allele_copies += alleleCopies
        bin.allele_ids.push(allele.variant_id)
        bins.set(longestPureRun!, bin)
      })
    }
  })

  return {
    status: 'available',
    motifs: motifs.map((motif, motifIndex) => ({
      motif,
      motif_index: motifIndex,
      bins: [...binsByMotif[motifIndex].values()].sort(
        (left, right) => left.longest_pure_run - right.longest_pure_run
      ),
    })),
  }
}
