// Shared color constants for haplotype visualizations
//
// Prefer VARIANT_CATEGORY_COLORS (5-category system) for new code.
// VARIANT_TYPE_COLORS (11-key per-allele-type) is retained for BubbleTrack's
// per-type rendering; it will be removed once BubbleTrack migrates.

export { VARIANT_CATEGORY_COLORS } from '../LongReadVariantPage/variantUtils'

// Alluvial path colors (categorical)
export const PATH_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
]

// Superpopulation palette — canonical gnomAD colors (matches the gnomAD paper and
// the rest of the browser, e.g. ShortTandemRepeatAlleleSizeDistributionPlot). Keep
// these in sync with gnomAD's standard population colors so the LR haplotype view
// reads the same as every other gnomAD view.
export const SUPERPOPULATION_COLORS: Record<string, string> = {
  AFR: '#941494',
  AMR: '#EF1E24',
  EAS: '#128B44',
  EUR: '#6AA6CE',
  SAS: '#FE9A10',
  ASJ: '#FF7E4F',
  OTH: '#ABB8B9',
  'N/A': '#9E9E9E',
}

// Variant type palette (for job 44 variant type coloring)
export const VARIANT_TYPE_COLORS: Record<string, string> = {
  snv: '#4A90D9',
  del: '#D73027',
  ins: '#43A047',
  dup: '#9467BD',
  trv: '#E8A838',
  dup_interspersed: '#7B4F9E',
  complex_dup: '#6A3D9A',
  alu_ins: '#33A02C',
  inv_dup: '#FF7F0E',
  inv: '#FF7F0E',
  other: '#9E9E9E',
}
