import { canonicalY1ContigLengths } from './y1_admission_config'

export type RestHaplotypeTargetDescriptor = {
  canonical_envelope: { chrom: string; start: number; stop: number }
  source_variant_ids: string[]
  selected_exact_allele_id: string
  fixed_window: { chrom: string; start: number; stop: number; flank_size: 50000 }
}

const bareChrom = (chrom: string) => chrom.replace(/^chr/i, '')

export const excludeTargetVariantsForAutoDefaults = <
  Variant extends { source_variant_id?: string | null }
>(
  variants: Variant[],
  carrierVariantIndices: Record<string, number[]>,
  descriptor?: RestHaplotypeTargetDescriptor
) => {
  if (!descriptor) return { variants, carrierVariantIndices }
  const targetSourceIds = new Set(descriptor.source_variant_ids)
  const retainedIndices = variants
    .map((variant, index) => ({ variant, index }))
    .filter(
      ({ variant }) => !variant.source_variant_id || !targetSourceIds.has(variant.source_variant_id)
    )
  const remappedIndex = new Map(retainedIndices.map(({ index }, nextIndex) => [index, nextIndex]))
  const filteredCarrierIndices = Object.fromEntries(
    Object.entries(carrierVariantIndices).map(([carrierId, indices]) => [
      carrierId,
      indices
        .map((index) => remappedIndex.get(index))
        .filter((index): index is number => index !== undefined),
    ])
  )
  return {
    variants: retainedIndices.map(({ variant }) => variant),
    carrierVariantIndices: filteredCarrierIndices,
  }
}

/** Parse the bounded display-only target sidecar accepted by the existing REST route. */
export const parseRestHaplotypeTargetDescriptor = (
  raw: unknown,
  request: { chrom: string; start: number; stop: number }
): RestHaplotypeTargetDescriptor | undefined => {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string' || raw.length > 32_768) {
    throw new Error('invalid target_descriptor')
  }

  let descriptor: any
  try {
    descriptor = JSON.parse(raw)
  } catch {
    throw new Error('invalid target_descriptor')
  }
  const envelope = descriptor?.canonical_envelope
  const window = descriptor?.fixed_window
  const sourceIds = descriptor?.source_variant_ids
  const contigLength =
    typeof window?.chrom === 'string'
      ? canonicalY1ContigLengths.get(`chr${bareChrom(window.chrom)}`)
      : undefined
  if (
    !envelope ||
    !window ||
    typeof envelope.chrom !== 'string' ||
    typeof window.chrom !== 'string' ||
    !Number.isInteger(envelope.start) ||
    !Number.isInteger(envelope.stop) ||
    !Number.isInteger(window.start) ||
    !Number.isInteger(window.stop) ||
    envelope.start < 1 ||
    envelope.stop < envelope.start ||
    window.start < 1 ||
    window.stop < envelope.stop ||
    window.start > envelope.start ||
    window.flank_size !== 50_000 ||
    !contigLength ||
    envelope.stop > contigLength ||
    window.start !== Math.max(1, envelope.start - 50_000) ||
    window.stop !== Math.min(contigLength, envelope.stop + 50_000) ||
    bareChrom(envelope.chrom) !== bareChrom(window.chrom) ||
    bareChrom(window.chrom) !== bareChrom(request.chrom) ||
    window.start !== request.start ||
    window.stop !== request.stop ||
    !Array.isArray(sourceIds) ||
    sourceIds.length === 0 ||
    sourceIds.length > 1_000 ||
    new Set(sourceIds).size !== sourceIds.length ||
    sourceIds.some(
      (id: unknown) => typeof id !== 'string' || id.length === 0 || id.length > 1_000
    ) ||
    typeof descriptor.selected_exact_allele_id !== 'string' ||
    descriptor.selected_exact_allele_id.length === 0 ||
    descriptor.selected_exact_allele_id.length > 2_000
  ) {
    throw new Error('invalid target_descriptor')
  }

  return descriptor as RestHaplotypeTargetDescriptor
}
