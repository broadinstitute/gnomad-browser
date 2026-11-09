import { ComponentProps, Dispatch, SetStateAction, useMemo, useState } from 'react'

import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { MitochondrialVariant } from '../MitochondrialVariantPage/MitochondrialVariantPage'
import { showNotification } from '../Notifications'
import userPreferences from '../userPreferences'
import { VariantTableContext } from '../VariantList/VariantTableContext'
import filterMitochondrialVariants from './filterMitochondrialVariants'
import MitochondrialVariantFilterControls from './MitochondrialVariantFilterControls'
import mitochondrialVariantTableColumns, {
  getColumnsForContext,
} from './mitochondrialVariantTableColumns'

export const DEFAULT_COLUMNS = [
  'source',
  'gene',
  'hgvs',
  'consequence',
  'clinical_significance',
  'flags',
  'an',
  'ac_hom',
  'af_hom',
  'ac_het',
  'af_het',
  'max_heteroplasmy',
]

type MitochondrialVariantFilterState = ComponentProps<
  typeof MitochondrialVariantFilterControls
>['value']
type MitochondrialVariantTableColumn = Omit<
  (typeof mitochondrialVariantTableColumns)[number],
  'tooltip'
> & {
  isSortable: boolean
  tooltip: string | undefined
}

export type MitochondrialVariantFiltering = {
  variants: MitochondrialVariant[]
  filter: MitochondrialVariantFilterState
  setFilter: Dispatch<SetStateAction<MitochondrialVariantFilterState>>
  selectedColumns: string[]
  saveSelectedColumns: (columns: string[]) => void
  renderedTableColumns: MitochondrialVariantTableColumn[]
  filteredVariants: ReturnType<typeof filterMitochondrialVariants>
}

type MitochondrialVariantFilteringOptions = {
  variants: MitochondrialVariant[]
  context: VariantTableContext
  clinvarReleaseDate: string
}

const useMitochondrialVariantFiltering = ({
  variants,
  context,
  clinvarReleaseDate,
}: MitochondrialVariantFilteringOptions): MitochondrialVariantFiltering => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    try {
      return userPreferences.getPreference('mitochondrialVariantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      return DEFAULT_COLUMNS
    }
  })

  const renderedTableColumns = useMemo(() => {
    const columnsForContext = getColumnsForContext(context) as Record<
      string,
      (typeof mitochondrialVariantTableColumns)[number]
    >
    if (columnsForContext.clinical_significance) {
      columnsForContext.clinical_significance.description = `ClinVar germline classification, formerly called clinical significance. Based on ClinVar's ${formatClinvarDate(
        clinvarReleaseDate
      )} release`
    }
    return ['variant_id', ...selectedColumns]
      .map((columnKey) => columnsForContext[columnKey])
      .filter(Boolean)
      .map((column) => ({
        ...column,
        isSortable: Boolean(column.compareFunction),
        tooltip: column.description,
      }))
  }, [clinvarReleaseDate, context, selectedColumns])

  const [filter, setFilter] = useState({
    includeCategories: {
      lof: true,
      missense: true,
      synonymous: true,
      other: true,
    },
    includeFilteredVariants: false,
    searchText: '',
  })

  const filteredVariants = useMemo(
    () => filterMitochondrialVariants(variants, filter, renderedTableColumns),
    [variants, filter, renderedTableColumns]
  )

  const saveSelectedColumns = (columns: string[]) => {
    setSelectedColumns(columns)
    userPreferences
      .savePreference('mitochondrialVariantTableColumns', columns)
      .then(null, (error: { message: string }) => {
        showNotification({ title: 'Error', message: error.message, status: 'error' })
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

export default useMitochondrialVariantFiltering
