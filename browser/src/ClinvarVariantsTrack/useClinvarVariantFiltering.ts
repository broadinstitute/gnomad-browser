import { Dispatch, SetStateAction, useMemo, useState } from 'react'

import { ClinvarVariant } from '../VariantPage/VariantPage'
import { VEP_CONSEQUENCE_CATEGORIES, getCategoryFromConsequence } from '../vepConsequences'
import {
  CLINICAL_SIGNIFICANCE_CATEGORIES,
  clinvarVariantClinicalSignificanceCategory,
} from './clinvarVariantCategories'

export type ClinvarFilterState = {
  includedClinicalSignificanceCategories: Record<string, boolean>
  includedConsequenceCategories: Record<string, boolean>
  showOnlyGnomad: boolean
  starFilter: number
}

export const DEFAULT_CLINVAR_FILTER_STATE: ClinvarFilterState = {
  includedClinicalSignificanceCategories: CLINICAL_SIGNIFICANCE_CATEGORIES.reduce<
    Record<string, boolean>
  >(
    (acc, category) => ({
      ...acc,
      [category]: true,
    }),
    {}
  ),
  includedConsequenceCategories: VEP_CONSEQUENCE_CATEGORIES.reduce<Record<string, boolean>>(
    (acc, category) => ({
      ...acc,
      [category]: true,
    }),
    {}
  ),
  showOnlyGnomad: false,
  starFilter: 0,
}

export const filterClinvarVariants = (
  variants: ClinvarVariant[],
  filter: ClinvarFilterState
): ClinvarVariant[] => {
  return variants.filter(
    (variant) =>
      filter.includedClinicalSignificanceCategories[
        clinvarVariantClinicalSignificanceCategory(variant)
      ] &&
      filter.includedConsequenceCategories[getCategoryFromConsequence(variant.major_consequence)] &&
      (!filter.showOnlyGnomad || variant.in_gnomad) &&
      variant.gold_stars >= filter.starFilter
  )
}

export type ClinvarVariantFiltering = {
  filter: ClinvarFilterState
  setFilter: Dispatch<SetStateAction<ClinvarFilterState>>
  filteredVariants: ClinvarVariant[]
}

const useClinvarVariantFiltering = (
  variants: ClinvarVariant[],
  isTrackMounted = true
): ClinvarVariantFiltering => {
  const [filter, setFilter] = useState(DEFAULT_CLINVAR_FILTER_STATE)
  const [wasTrackMounted, setWasTrackMounted] = useState(isTrackMounted)
  if (wasTrackMounted !== isTrackMounted) {
    setWasTrackMounted(isTrackMounted)
    if (!isTrackMounted) {
      setFilter(DEFAULT_CLINVAR_FILTER_STATE)
    }
  }
  const filteredVariants = useMemo(
    () => filterClinvarVariants(variants, filter),
    [variants, filter]
  )

  return { filter, setFilter, filteredVariants }
}

export default useClinvarVariantFiltering
