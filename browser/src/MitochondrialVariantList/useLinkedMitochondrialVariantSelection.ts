import { useMemo, useState } from 'react'

import useClinvarVariantFiltering, {
  ClinvarVariantFiltering,
} from '../ClinvarVariantsTrack/useClinvarVariantFiltering'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import { ClinvarVariant } from '../VariantPage/VariantPage'
import { selectLinkedVariants } from '../VariantList/useLinkedVariantSelection'
import { VariantTableContext } from '../VariantList/VariantTableContext'
import { VariantSyncState } from '../VariantList/VariantSyncControl'
import useMitochondrialVariantFiltering, {
  MitochondrialVariantFiltering,
} from './useMitochondrialVariantFiltering'

type LinkedMitochondrialVariantSelectionOptions = {
  clinvarVariants: ClinvarVariant[] | null | undefined
  variants: MitochondrialVariant[]
  context: VariantTableContext
  clinvarReleaseDate: string
}

const useLinkedMitochondrialVariantSelection = ({
  clinvarVariants,
  variants,
  context,
  clinvarReleaseDate,
}: LinkedMitochondrialVariantSelectionOptions): {
  clinvar: ClinvarVariantFiltering
  gnomad: MitochondrialVariantFiltering
  sync: VariantSyncState
} => {
  const [syncEnabled, setSyncEnabled] = useState(false)
  const syncAvailable = clinvarVariants !== null && clinvarVariants !== undefined
  const clinvar = useClinvarVariantFiltering(clinvarVariants ?? [])
  const gnomad = useMitochondrialVariantFiltering({
    variants,
    context,
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

export default useLinkedMitochondrialVariantSelection
