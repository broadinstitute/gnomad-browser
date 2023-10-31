import { sortedIndexBy, sortedLastIndexBy } from 'lodash-es'
import { CopyNumberVariant } from '../CopyNumberVariantPage/CopyNumberVariantPage'

const filterVariantsInZoomRegion = (variants: any, zoomRegion: any) => {
  if (!zoomRegion) {
    return variants
  }
  const { start, stop } = zoomRegion
  const startIndex = sortedIndexBy(variants, { pos: start }, (variant: any) => variant.pos)
  const stopIndex = sortedLastIndexBy(variants, { pos: stop }, (variant: any) => variant.pos)
  return variants.slice(startIndex, stopIndex + 1)
}

export default filterVariantsInZoomRegion

export const filterStructuralVariantsInZoomRegion = (structuralVariants: any, zoomRegion: any) => {
  if (!zoomRegion) {
    return structuralVariants
  }
  const { start, stop } = zoomRegion
  return structuralVariants.filter(
    (variant: any) =>
      (variant.pos <= stop && variant.end >= start) ||
      (variant.pos2 <= stop && variant.end2 >= start)
  )
}

export const filterCopyNumberVariantsInZoomRegion = (
  copyNumberVariants: CopyNumberVariant[],
  zoomRegion: any
) => {
  if (!zoomRegion) {
    return copyNumberVariants
  }
  const { start, stop } = zoomRegion
  return copyNumberVariants.filter((variant: any) => variant.pos <= stop && variant.end >= start)
}
