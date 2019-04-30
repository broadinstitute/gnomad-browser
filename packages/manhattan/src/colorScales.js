export const rotateColorByChromosome = (colors, chromosomes) => {
  const chromosomeColors = chromosomes.reduce(
    (acc, chr, i) => ({
      ...acc,
      [chr]: colors[i % colors.length],
    }),
    {}
  )

  return dataPoint => chromosomeColors[dataPoint.chrom]
}
