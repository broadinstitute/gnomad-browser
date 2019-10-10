const allChromosomes = [...Array.from(new Array(22), (x, i) => `${i + 1}`), 'X', 'Y', 'M']
const chromosomeNumbers = allChromosomes.reduce(
  (acc, chrom, i) => ({
    ...acc,
    [chrom]: i + 1,
  }),
  {}
)

export const xPosition = (chrom, pos) => {
  const chromStart = chromosomeNumbers[chrom] * 1e9
  const xpos = chromStart + pos

  if (Number.isNaN(xpos)) {
    throw new Error(`Unable to calculate xpos for ${chrom}:${pos}`)
  }

  return xpos
}
