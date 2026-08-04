export type STRHistogramPopulation = {
  key: string
  histogram: string
}

export type STRHistogram = {
  motif?: unknown
  max_repeats?: unknown
  populations: STRHistogramPopulation[]
}

export type HistogramSex = 'XX' | 'XY' | 'unknown'

export const parseHistogramSex = (sourceSex: string | undefined): HistogramSex => {
  if (sourceSex === 'female') return 'XX'
  if (sourceSex === 'male') return 'XY'
  return 'unknown'
}

const normalizedMotifs = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value]
  return values
    .flatMap((motif) => (typeof motif === 'string' ? motif.split(',') : []))
    .map((motif) => motif.trim())
    .filter(Boolean)
}

export const parseAlleleSizeDistribution = (
  populations: STRHistogramPopulation[],
  repeatUnit = ''
) => {
  const results = populations
    .filter(({ key }) => key.startsWith('AlleleSizeHistogram:'))
    .map(({ key, histogram }) => {
      const parts = key.split(':')
      const ancestry_group = parts[1]
      const sex = parseHistogramSex(parts[2])
      const distribution = histogram
        .split(',')
        .filter((bin) => bin.includes('x'))
        .map((bin) => {
          const [countStr, freqStr] = bin.split(':')
          return {
            repunit_count: parseInt(countStr.replace('x', ''), 10),
            frequency: parseInt(freqStr, 10),
          }
        })
      return { ancestry_group, sex, repunit: repeatUnit, distribution }
    })
  return results.length > 0 ? results : null
}

export const parseGenotypeDistribution = (
  populations: STRHistogramPopulation[],
  repeatUnit = ''
) => {
  const results = populations
    .filter(({ key }) => key.startsWith('BiallelicHistogram:'))
    .map(({ key, histogram }) => {
      const parts = key.split(':')
      const ancestry_group = parts[1]
      const sex = parseHistogramSex(parts[2])
      const distribution = histogram
        .split(',')
        .filter((bin) => bin.includes(':'))
        .map((bin) => {
          const [countsStr, freqStr] = bin.split(':')
          const [shortStr, longStr] = countsStr.split('/')
          return {
            short_allele_repunit_count: parseInt(shortStr, 10),
            long_allele_repunit_count: parseInt(longStr, 10),
            frequency: parseInt(freqStr, 10),
          }
        })
      return {
        ancestry_group,
        sex,
        short_allele_repunit: repeatUnit,
        long_allele_repunit: repeatUnit,
        distribution,
      }
    })
  return results.length > 0 ? results : null
}

export const enrichVariantWithSTRHistogram = (variant: any, histogram: STRHistogram) => {
  const ancillaryMotifs = normalizedMotifs(histogram.motif)
  const existingMotifs = normalizedMotifs(variant.motifs)
  const motifs = ancillaryMotifs.length > 0 ? ancillaryMotifs : existingMotifs
  const repeatUnit =
    ancillaryMotifs.length > 0 ? ancillaryMotifs.join(',') : existingMotifs.join(',')
  const maxRepeats = Number(histogram.max_repeats)

  return {
    ...variant,
    motifs,
    allele_size_distribution: parseAlleleSizeDistribution(histogram.populations, repeatUnit),
    genotype_distribution: parseGenotypeDistribution(histogram.populations, repeatUnit),
    max_repunits:
      histogram.max_repeats != null && Number.isFinite(maxRepeats)
        ? maxRepeats
        : variant.max_repunits,
  }
}
