import type { SampleMetadataMap } from '../HaplotypeRegionPage/HaplotypeRegionPage'
import { hexToRgba } from '../LongReadVariantPage/variantColorUtils'
import { SUPERPOPULATION_COLORS } from './colors'

export type RgbaColor = [number, number, number, number]

const NEUTRAL_LABEL_COLOR: RgbaColor = [40, 40, 40, 255]

/**
 * Use ancestry color only when every sample represented by a diploid row has
 * the same recognized superpopulation. Composite rows with ambiguous ancestry
 * remain neutral.
 */
export function getDiploidSampleLabelColor(
  samples: { sample_id: string }[],
  sampleMetadata?: SampleMetadataMap
): RgbaColor {
  if (samples.length === 0 || !sampleMetadata) return NEUTRAL_LABEL_COLOR

  const superpopulations = samples.map(
    (sample) => sampleMetadata.get(sample.sample_id)?.superpopulation
  )
  const hasInvalidSuperpopulation = superpopulations.some(
    (superpopulation) =>
      !superpopulation ||
      superpopulation === 'N/A' ||
      !Object.prototype.hasOwnProperty.call(SUPERPOPULATION_COLORS, superpopulation)
  )
  if (hasInvalidSuperpopulation) return NEUTRAL_LABEL_COLOR

  const sharedSuperpopulation = superpopulations[0]!
  if (!superpopulations.every((superpopulation) => superpopulation === sharedSuperpopulation)) {
    return NEUTRAL_LABEL_COLOR
  }

  return hexToRgba(SUPERPOPULATION_COLORS[sharedSuperpopulation])
}
