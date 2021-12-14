import { sortedIndexBy } from 'lodash-es'

const filterVariantsInZoomRegion = (variants, { start, stop }) => {
  const startIndex = sortedIndexBy(variants, { pos: start }, variant => variant.pos)
  const stopIndex = sortedIndexBy(variants, { pos: stop }, variant => variant.pos)
  return variants.slice(startIndex, stopIndex + 1)
}

export default filterVariantsInZoomRegion
