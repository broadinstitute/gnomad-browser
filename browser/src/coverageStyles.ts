// Shared appearance for the exome and genome series.
//
// The coverage configs and the allele number config draw the same two data
// types on the same track, so they must not drift apart: switching metrics
// should not change which colour is the exome, or which series is drawn on top.
const EXOME_COLOR = 'rgb(70, 130, 180)'
const GENOME_COLOR = 'rgb(115, 171, 61)'
// The exome series covers less of the track, so it is the more opaque of the two.
const EXOME_OPACITY = 0.7
const GENOME_OPACITY = 0.5

export const coverageConfigClassic = (exomeCoverage: any, genomeCoverage: any) => {
  const coverage = []
  if (exomeCoverage) {
    coverage.push({
      color: EXOME_COLOR,
      buckets: exomeCoverage,
      name: 'exome',
    })
  }
  if (genomeCoverage) {
    coverage.push({
      color: GENOME_COLOR,
      buckets: genomeCoverage,
      name: 'genome',
    })
  }
  return coverage
}

export const coverageConfigNew = (exomeCoverage: any, genomeCoverage: any) => {
  const coverage = []
  if (exomeCoverage) {
    coverage.push({
      color: EXOME_COLOR,
      buckets: exomeCoverage,
      name: 'exome',
      opacity: EXOME_OPACITY,
    })
  }
  if (genomeCoverage) {
    coverage.push({
      color: GENOME_COLOR,
      buckets: genomeCoverage,
      name: 'genome',
      opacity: GENOME_OPACITY,
    })
  }
  return coverage
}

/**
 * Series appearance for the call rate metric.
 *
 * Identical to `coverageConfigNew` on purpose, and aliased rather than copied so
 * it cannot become different by accident: the legend must not change colour or
 * order when the reader switches between a coverage metric and call rate.
 */
export const alleleNumberConfig = coverageConfigNew
