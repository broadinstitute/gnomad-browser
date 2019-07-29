export const getXpos = (chr, pos) => {
  const autosomes = Array.from(new Array(22), (x, i) => `chr${i + 1}`)
  const chromosomes = [...autosomes, 'chrX', 'chrY', 'chrM']
  const chromosomeCodes = chromosomes.reduce((acc, chrom, i) => {
    return { ...acc, [chrom]: i + 1 }
  }, {})
  const chrStart = chromosomeCodes[`chr${chr}`] * 1e9
  const xpos = chrStart + Number(pos)
  return xpos
}
