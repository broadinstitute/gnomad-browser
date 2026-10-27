import { useMemo, useState } from 'react'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import useClinvarVariantFiltering, {
  ClinvarVariantFiltering,
} from '../ClinvarVariantsTrack/useClinvarVariantFiltering'
import filterVariantsInZoomRegion from '../RegionViewer/filterVariantsInZoomRegion'
import { ClinvarVariant, Variant } from '../VariantPage/VariantPage'
import useVariantFiltering, { VariantFiltering } from './useVariantFiltering'
import { VariantTableContext } from './VariantTableContext'
import { VariantSyncState } from './VariantSyncControl'

export const selectLinkedVariants = <
  C extends { variant_id: string },
  G extends { variant_id: string }
>(
  clinvar: C[],
  gnomad: G[],
  syncActive: boolean
): { clinvar: C[]; gnomad: G[] } => {
  if (!syncActive) {
    return { clinvar, gnomad }
  }
  const gnomadIds = new Set(gnomad.map((variant) => variant.variant_id))
  const sharedClinvar = clinvar.filter((variant) => gnomadIds.has(variant.variant_id))
  const sharedIds = new Set(sharedClinvar.map((variant) => variant.variant_id))
  return {
    clinvar: sharedClinvar,
    gnomad: gnomad.filter((variant) => sharedIds.has(variant.variant_id)),
  }
}

type LinkedVariantSelectionOptions = {
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: Variant[]
  context: VariantTableContext
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
  sync: VariantSyncState
} => {
  const [syncEnabled, setSyncEnabled] = useState(false)
  const syncAvailable = clinvarVariants !== null && clinvarVariants !== undefined
  const clinvarVariantsInZoom = useMemo(() => {
    return filterVariantsInZoomRegion(clinvarVariants || [], zoomRegion)
  }, [clinvarVariants, zoomRegion])
  const variantsInZoom = useMemo(() => {
    return filterVariantsInZoomRegion(variants, zoomRegion)
  }, [variants, zoomRegion])

  const clinvar = useClinvarVariantFiltering(clinvarVariantsInZoom)
  const gnomad = useVariantFiltering({
    variants: variantsInZoom,
    context,
    datasetId,
    clinvarReleaseDate,
  })

  const selected = useMemo(() => {
    return selectLinkedVariants(
      clinvar.filteredVariants,
      gnomad.filteredVariants,
      syncEnabled && syncAvailable
    )
  }, [clinvar.filteredVariants, gnomad.filteredVariants, syncEnabled, syncAvailable])

  const clinvarSelection = useMemo(
    () => ({
      filter: clinvar.filter,
      setFilter: clinvar.setFilter,
      filteredVariants: selected.clinvar,
    }),
    [clinvar.filter, clinvar.setFilter, selected.clinvar]
  )
  const sync = useMemo(
    () => ({ enabled: syncEnabled, available: syncAvailable, onChange: setSyncEnabled }),
    [syncEnabled, syncAvailable]
  )

  return {
    clinvar: clinvarSelection,
    gnomad: { ...gnomad, filteredVariants: selected.gnomad },
    sync,
  }
}

export default useLinkedVariantSelection
