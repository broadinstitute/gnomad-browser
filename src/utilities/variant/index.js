import R from 'ramda'
import { range } from 'd3-array'

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

export const getPositionsToFetch = (
  position,
  padding,
  positionsWithData,
) => {
  const first = position - padding
  const last = position + padding
  const toTest = range(first, last)
  const [_, fetchThese] = R.partition((pos => R.contains(pos, positionsWithData)), toTest)
  return fetchThese
}
