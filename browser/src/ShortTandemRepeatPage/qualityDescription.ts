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
