import { longReadAncestryGroupDisplayId } from '../LongReadVariantPage/longReadAncestryGroups'
import { SUPERPOPULATION_COLORS } from './colors'

type Sample = { sample_id?: string | null } | null | undefined

type SampleAncestryMetadata = {
  subpopulation?: string | null
  superpopulation?: string | null
}

type SampleAncestryMetadataMap = ReadonlyMap<string, SampleAncestryMetadata>

const UNAVAILABLE_METADATA_VALUES = new Set([
  '',
  '.',
  'n/a',
  'na',
  'null',
  'unavailable',
  'unknown',
])

const normalizedMetadataValue = (value: string | null | undefined): string | null => {
  const trimmedValue = value?.trim()
  if (!trimmedValue || UNAVAILABLE_METADATA_VALUES.has(trimmedValue.toLowerCase())) return null
  return longReadAncestryGroupDisplayId(trimmedValue)
}

const formatGeneticAncestryGroup = (value: string | null | undefined): string => {
  const displayId = normalizedMetadataValue(value)
  if (!displayId) return 'unavailable'
  if (!Object.prototype.hasOwnProperty.call(SUPERPOPULATION_COLORS, displayId)) {
    return `unrecognized (${displayId})`
  }
  return displayId
}

const formatGeneticAncestrySubgroup = (value: string | null | undefined): string =>
  normalizedMetadataValue(value) || 'unavailable'

/**
 * Format ancestry metadata for the samples represented by one diploid row.
 * Composite rows retain per-sample attribution rather than implying that one
 * ancestry value applies to every sample.
 */
export const formatSampleAncestryTooltip = (
  samples: Sample[],
  sampleMetadata?: SampleAncestryMetadataMap
): string => {
  if (samples.length === 0) {
    return [
      'Sample ID: unavailable',
      'Genetic ancestry group: unavailable',
      'Genetic ancestry subgroup: unavailable',
    ].join('\n')
  }

  return samples
    .map((sample) => {
      const sampleId = sample?.sample_id?.trim()
      const metadata = sampleId ? sampleMetadata?.get(sampleId) : undefined
      return [
        `Sample ID: ${sampleId || 'unavailable'}`,
        `Genetic ancestry group: ${formatGeneticAncestryGroup(metadata?.superpopulation)}`,
        `Genetic ancestry subgroup: ${formatGeneticAncestrySubgroup(metadata?.subpopulation)}`,
      ].join('\n')
    })
    .join('\n\n')
}
