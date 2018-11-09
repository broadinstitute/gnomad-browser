import { HUMAN_CHROMOSOMES } from '@broad/utilities'

export function colorByChromosome(colors) {
  const CHROMOSOME_COLORS = HUMAN_CHROMOSOMES.reduce((acc, chr, i) => ({
    ...acc,
    [chr]: colors[i % colors.length],
  }), {})
  return dataPoint => CHROMOSOME_COLORS[dataPoint.chromosome]
}
