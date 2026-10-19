import { Dispatch, SetStateAction, useMemo, useState } from 'react'

import { DatasetId } from '@gnomad/dataset-metadata/metadata'
import { Gene } from '../GenePage/GenePage'
import { showNotification } from '../Notifications'
import userPreferences from '../userPreferences'
import { Variant } from '../VariantPage/VariantPage'
import { getCategoryFromConsequence } from '../vepConsequences'
import mergeExomeAndGenomeData from './mergeExomeAndGenomeData'
import {
  DEFAULT_COLUMNS,
  getRenderedVariantTableColumns,
  VariantTableColumn,
} from './variantTableColumns'

type Categories = {
  lof: boolean
  missense: boolean
  synonymous: boolean
  other: boolean
}

export type VariantFilterState = {
  includeCategories: Categories
  includeFilteredVariants: boolean
  includeSNVs: boolean
  includeIndels: boolean
  includeExomes: boolean
  includeGenomes: boolean
  includeContext: boolean
  searchText: string
}

export const DEFAULT_VARIANT_FILTER_STATE: VariantFilterState = {
  includeCategories: {
    lof: true,
    missense: true,
    synonymous: true,
    other: true,
  },
  includeFilteredVariants: false,
  includeSNVs: true,
  includeIndels: true,
  includeExomes: true,
  includeGenomes: true,
  includeContext: true,
  searchText: '',
}

export const getFilteredVariants = (
  filter: VariantFilterState,
  variants: Variant[],
  variantTableColumns: VariantTableColumn[]
): Variant[] => {
  const searchColumns = variantTableColumns.filter((column) => !!column.getSearchTerms)
  const getVariantSearchTerms = (variant: Variant) =>
    searchColumns
      .flatMap((column) => {
        if (column.getSearchTerms) {
          return column.getSearchTerms(variant)
        }
        return []
      })
      .filter(Boolean)
      .map((s: any) => s.toLowerCase())

  const searchTerms = filter.searchText
    .toLowerCase()
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)

  return variants.filter((variant: Variant) =>
    getVariantSearchTerms(variant).some((variantTerm: string) =>
      searchTerms.some((searchTerm: string) => variantTerm.includes(searchTerm))
    )
  )
}

export const filterVariants = (
  variants: Variant[],
  filter: VariantFilterState,
  selectedColumns: any
): Variant[] => {
  let filteredVariants = variants

  const isEveryConsequenceCategorySelected =
    filter.includeCategories.lof &&
    filter.includeCategories.missense &&
    filter.includeCategories.synonymous &&
    filter.includeCategories.other

  if (!isEveryConsequenceCategorySelected) {
    filteredVariants = variants.filter((variant: any) => {
      const category =
        (getCategoryFromConsequence(variant.consequence) as keyof Categories) || 'other'
      return filter.includeCategories[category]
    })
  }

  if (!filter.includeFilteredVariants) {
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      exome: v.exome && v.exome.filters.length === 0 ? v.exome : null,
      genome: v.genome && v.genome.filters.length === 0 ? v.genome : null,
    }))
  }

  if (!filter.includeExomes) {
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      exome: null,
    }))
  }

  if (!filter.includeGenomes) {
    filteredVariants = filteredVariants.map((v: Variant) => ({
      ...v,
      genome: null,
    }))
  }

  filteredVariants = filteredVariants.filter((v: Variant) => v.exome || v.genome)

  if (filter.searchText && !filter.includeContext) {
    filteredVariants = getFilteredVariants(filter, filteredVariants, selectedColumns)
  }

  filteredVariants = filteredVariants.filter((v: Variant) => {
    const splits = v.variant_id.split('-')
    const refLength = splits[2].length
    const altLength = splits[3].length

    const isSNV = refLength === 1 && altLength === 1
    const isIndel = refLength !== altLength

    return (filter.includeSNVs && isSNV) || (filter.includeIndels && isIndel)
  })

  return filteredVariants
}

export type VariantFiltering = {
  variants: Variant[]
  filter: VariantFilterState
  setFilter: Dispatch<SetStateAction<VariantFilterState>>
  selectedColumns: string[]
  saveSelectedColumns: (columns: string[]) => void
  renderedTableColumns: ReturnType<typeof getRenderedVariantTableColumns>
  filteredVariants: ReturnType<typeof mergeExomeAndGenomeData>
}

type VariantFilteringOptions = {
  variants: Variant[]
  context: Gene
  datasetId: DatasetId
  clinvarReleaseDate: string
}

const useVariantFiltering = ({
  variants,
  context,
  datasetId,
  clinvarReleaseDate,
}: VariantFilteringOptions): VariantFiltering => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    try {
      return userPreferences.getPreference('variantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      return DEFAULT_COLUMNS
    }
  })

  const renderedTableColumns = useMemo(() => {
    return getRenderedVariantTableColumns(context, selectedColumns, clinvarReleaseDate)
  }, [clinvarReleaseDate, context, selectedColumns])

  const [filter, setFilter] = useState(DEFAULT_VARIANT_FILTER_STATE)

  const filteredVariants = useMemo(() => {
    return mergeExomeAndGenomeData({
      datasetId,
      variants: filterVariants(variants, filter, renderedTableColumns),
      preferJointData: filter.includeExomes && filter.includeGenomes,
    })
  }, [datasetId, variants, filter, renderedTableColumns])

  const saveSelectedColumns = (columns: string[]) => {
    setSelectedColumns(columns)
    userPreferences
      .savePreference('variantTableColumns', columns)
      .then(null, (error: { message: string }) => {
        showNotification({
          title: 'Error',
          message: error.message,
          status: 'error',
        })
      })
  }

  return {
    variants,
    filter,
    setFilter,
    selectedColumns,
    saveSelectedColumns,
    renderedTableColumns,
    filteredVariants,
  }
}

export default useVariantFiltering
