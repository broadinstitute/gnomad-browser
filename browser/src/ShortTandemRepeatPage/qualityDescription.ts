import { scaleLinear } from 'd3-scale'

export const genotypeQualityKeys = [
  'low',
  'medium-low',
  'medium',
  'medium-high',
  'high',
  'not-reviewed',
] as const

export type GenotypeQuality = (typeof genotypeQualityKeys)[number]

export const qualityDescriptionLabels: Record<GenotypeQuality, string> = {
  low: 'Low',
  'medium-low': 'Medium-low',
  medium: 'Medium',
  'medium-high': 'Medium-high',
  high: 'High',
  'not-reviewed': 'Not reviewed',
}

export const genotypeQualityColors: Record<GenotypeQuality, string> = {
  low: '#d73027',
  'medium-low': '#fc8d59',
  medium: '#fee08b',
  'medium-high': '#d9ef8b',
  high: '#1a9850',
  'not-reviewed': '#aaaaaa',
}

// Manually reviewed qualities in order, scored 1 (low) to 5 (high)
export const reviewedGenotypeQualitiesFromLowToHigh = genotypeQualityKeys.filter(
  (quality) => quality !== 'not-reviewed'
)

// Blends the colors of the two adjacent qualities that an average score on the 1 to 5 scale
// falls between. For example, 4.25 is 75% Medium-high and 25% High.
const averageGenotypeQualityColorScale = scaleLinear<string>()
  .domain(reviewedGenotypeQualitiesFromLowToHigh.map((_quality, index) => index + 1))
  .range(reviewedGenotypeQualitiesFromLowToHigh.map((quality) => genotypeQualityColors[quality]))
  .clamp(true)

export const colorForAverageGenotypeQuality = (averageQuality: number): string =>
  averageGenotypeQualityColorScale(averageQuality)
