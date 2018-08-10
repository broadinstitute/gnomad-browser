import R from 'ramda'
import { range } from 'd3-array'


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

export const getTableIndexByPosition = (position, variants) => {
  if (variants.size) {
    return variants.findIndex((variant, i) => {
      if (variants.get(i + 1)) {
        return position >= variant.pos && position <= variants.get(i + 1).pos
      }
      return variants.size - 1
    })
  }
  return variants.findIndex((variant, i) => {
    if (variants[i + 1]) {
      return position >= variant.pos && position <= variants[i + 1].pos
    }
    return variants.length - 1
  })
}

// export const getCategory
