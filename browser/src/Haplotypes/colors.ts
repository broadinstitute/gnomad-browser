// Shared color constants for haplotype visualizations

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

// Superpopulation palette (for job 45 population coloring)
export const SUPERPOPULATION_COLORS: Record<string, string> = {
  AFR: '#FF6F00',
  AMR: '#A05EB5',
  EAS: '#43A047',
  EUR: '#1E88E5',
  SAS: '#E53935',
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
