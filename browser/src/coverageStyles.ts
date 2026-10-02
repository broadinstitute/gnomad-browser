/**
 * Shared exome/genome series appearance.
 *
 * The AN configs and the coverage configs draw the same two data types, so they
 * must not drift apart: a reader switching metrics should see the same exome
 * blue and genome green at the same weights. Kept here rather than inlined so
 * there is one place to change them.
 */
const EXOME_COLOR = 'rgb(70, 130, 180)'
const GENOME_COLOR = 'rgb(115, 171, 61)'
// Exome sits on top of genome and is the narrower series, so it is the more opaque.
const EXOME_OPACITY = 0.7
const GENOME_OPACITY = 0.5

export const coverageConfigClassic = (exomeCoverage: any, genomeCoverage: any) => {
  const coverage = []
  if (exomeCoverage) {
    coverage.push({
      color: 'rgb(70, 130, 180)',
      buckets: exomeCoverage,
      name: 'exome',
    })
  }
  if (genomeCoverage) {
    coverage.push({
      color: 'rgb(115, 171, 61)',
      buckets: genomeCoverage,
      name: 'genome',
    })
  }
  return coverage
}

/**
 * Dataset config for the allele-number metrics.
 *
 * Deliberately reuses the exome-blue / genome-green pairing of the coverage
 * configs below: on a gene page the AN metrics are an alternate view of the
 * same two data types, so recoloring them would imply they are different
 * series. Genome AN is drawn under exome AN (exome AN exists only over the
 * capture target, so it reads as islands on top of a continuous genome track).
 */
export const anConfig = (exomeAN: any, genomeAN: any) => {
  const an = []
  if (genomeAN) {
    an.push({
      color: GENOME_COLOR,
      buckets: genomeAN,
      name: 'genome',
      opacity: GENOME_OPACITY,
    })
  }
  if (exomeAN) {
    an.push({
      color: EXOME_COLOR,
      buckets: exomeAN,
      name: 'exome',
      opacity: EXOME_OPACITY,
    })
  }
  return an
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
