import { useMemo } from 'react'

import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import {
  LinkedVariantSelection,
  useLinkedClinvarAndGnomadSelection,
} from '../VariantList/useLinkedVariantSelection'
import { VariantTableContext } from '../VariantList/VariantTableContext'
import useMitochondrialVariantFiltering, {
  MitochondrialVariantFiltering,
} from './useMitochondrialVariantFiltering'

type LinkedMitochondrialVariantSelectionOptions = {
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: MitochondrialVariant[]
  context: VariantTableContext
  clinvarReleaseDate: string
  zoomRegion?: { start: number; stop: number } | null
}

const useLinkedMitochondrialVariantSelection = ({
  clinvarVariants,
  variants,
  context,
  clinvarReleaseDate,
  zoomRegion,
}: LinkedMitochondrialVariantSelectionOptions): LinkedVariantSelection<MitochondrialVariantFiltering> => {
  const variantsInZoom = useMemo(() => {
    return filterVariantsInZoomRegion(variants, zoomRegion)
  }, [variants, zoomRegion])
  const gnomad = useMitochondrialVariantFiltering({
    variants: variantsInZoom,
    context,
    clinvarReleaseDate,
  })

  return useLinkedClinvarAndGnomadSelection({ clinvarVariants, zoomRegion, gnomad })
}

export default useLinkedMitochondrialVariantSelection
