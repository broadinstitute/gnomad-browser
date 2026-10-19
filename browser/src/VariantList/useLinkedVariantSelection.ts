import { useMemo } from 'react'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import useClinvarVariantFiltering, {
  ClinvarVariantFiltering,
} from '../ClinvarVariantsTrack/useClinvarVariantFiltering'
import { Gene } from '../GenePage/GenePage'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { ClinvarVariant, Variant } from '../VariantPage/VariantPage'
import useVariantFiltering, { VariantFiltering } from './useVariantFiltering'

type LinkedVariantSelectionOptions = {
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: Variant[]
  context: Gene
  datasetId: DatasetId
  clinvarReleaseDate: string
  zoomRegion?: { start: number; stop: number } | null
}

const useLinkedVariantSelection = ({
  clinvarVariants,
  variants,
  context,
  datasetId,
  clinvarReleaseDate,
  zoomRegion,
}: LinkedVariantSelectionOptions): {
  clinvar: ClinvarVariantFiltering
  gnomad: VariantFiltering
} => {
  const clinvarVariantsInZoom = useMemo(() => {
    return filterVariantsInZoomRegion(clinvarVariants || [], zoomRegion)
  }, [clinvarVariants, zoomRegion])
  const variantsInZoom = useMemo(() => {
    return filterVariantsInZoomRegion(variants, zoomRegion)
  }, [variants, zoomRegion])

  const clinvar = useClinvarVariantFiltering(
    clinvarVariantsInZoom,
    Boolean(clinvarVariants && clinvarVariants.length > 0)
  )
  const gnomad = useVariantFiltering({
    variants: variantsInZoom,
    context,
    datasetId,
    clinvarReleaseDate,
  })

  return { clinvar, gnomad }
}

export default useLinkedVariantSelection
