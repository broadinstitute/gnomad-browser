import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'

import { DatasetId, isLongRead, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { showNotification } from '../Notifications'
import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import userPreferences from '../userPreferences'
import ExportVariantsButton from './ExportVariantsButton'
import filterVariants, { VariantFilterState, getFilteredVariants } from './filterVariants'
import mergeExomeAndGenomeData from './mergeExomeAndGenomeData'
import VariantFilterControls from './VariantFilterControls'
import VariantTable from './VariantTable'
import variantTableColumns, { getColumnsForContext } from './variantTableColumns'
import VariantTableConfigurationModal from './VariantTableConfigurationModal'
import VariantTrack from './VariantTrack'
import { Variant } from '../VariantPage/VariantPage'
import { Gene } from '../GenePage/GenePage'
import { LongReadVariant } from '../LongReadVariantPage/LongReadVariantPage'

const DEFAULT_COLUMNS = [
  'short_read_match_id',
  'source',
  'gene',
  'hgvs',
  'consequence',
  'lof_curation',
  'clinical_significance',
  'flags',
  'ac',
  'an',
  'af',
  'homozygote_count',
  'hemizygote_count',
]

const sortVariants = (variants: any[], { sortKey, sortOrder }: any, parentIdColumn?: string) => {
  const sortColumn = variantTableColumns.find((column) => column.key === sortKey)
  const compareFunction = sortColumn?.compareFunction
  if (!compareFunction) {
    return variants
  }

  if (parentIdColumn === undefined) {
    return [...variants].sort((v1, v2) => compareFunction(v1, v2, sortOrder))
  }

  const variantsById = variants.reduce(
    (acc, variant) => ({ ...acc, [variant.variant_id]: variant }),
    {}
  )
  // Possible cases:
  // if v1 and v2 have the same parent ID (or both are undefined/null),
  // compare v1 and v2 by the compare function
  //
  // if v1 is v2's parent, sort v2 after v1
  // vice versa if v2 is v1's parent
  //
  // if v1 has a parent ID and v2 doesn't, compare v1's parent to v2
  // vice versa if v1 has no parent ID, but v2 has one
  //
  // otherwise they have different non-missing parent IDs, compare v1's parent to v2's

  return [...variants].sort((v1, v2) => {
    const v1ParentId = v1[parentIdColumn]
    const v2ParentId = v2[parentIdColumn]
    const v1ParentMissing = v1ParentId === null || v1ParentId === undefined
    const v2ParentMissing = v2ParentId === null || v2ParentId === undefined

    if (v1ParentId === v2ParentId) {
      return compareFunction(v1, v2, sortOrder)
    }

    if (v1ParentMissing && v2ParentMissing) {
      return compareFunction(v1, v2, sortOrder)
    }

    if (v1.variant_id === v2ParentId) {
      return -1
    }

    if (v2.variant_id === v1ParentId) {
      return 1
    }

    if (!v1ParentMissing && v2ParentMissing) {
      return compareFunction(variantsById[v1ParentId], v2, sortOrder)
    }

    if (v1ParentMissing && !v2ParentMissing) {
      return compareFunction(v1, variantsById[v2ParentId], sortOrder)
    }

    return compareFunction(variantsById[v1ParentId], variantsById[v2ParentId], sortOrder)
  })
}

type OwnVariantsProps = {
  children?: any
  clinvarReleaseDate: string
  context: Gene
  datasetId: DatasetId
  exportFileName?: string
  variants: Variant[] | LongReadVariant[]
  parentIdColumn?: string
}

const variantsDefaultProps = {
  children: null,
  exportFileName: 'variants',
}

type VariantsProps = OwnVariantsProps & typeof variantsDefaultProps

export function getFirstIndexFromSearchText(
  searchFilter: VariantFilterState,
  variantSearched: Variant[],
  variantsTableColumns: any,
  variantWindow: number[]
) {
  const searchedVariants = getFilteredVariants(searchFilter, variantSearched, variantsTableColumns)

  if (searchedVariants.length > 0) {
    const firstVariant = searchedVariants[0]
    const firstIndex = variantSearched.findIndex(
      (variant: Variant) => variant.pos === firstVariant.pos
    )
    if (variantWindow[0] !== null && firstIndex < variantWindow[0]) {
      return firstIndex - 10
    }
    return firstIndex + 10
  }
  return variantWindow[0]
}

const filterCollapsedEnvelopedVariants = (
  variants: LongReadVariant[],
  expandedEnvelopingTRIds: string[]
) =>
  variants.filter(
    (variant) =>
      !variant.enveloping_tr_id || expandedEnvelopingTRIds.includes(variant.enveloping_tr_id)
  )

type SortState = {
  sortKey: string
  sortOrder: 'ascending' | 'descending'
}
const Variants = ({
  children = null,
  clinvarReleaseDate,
  context,
  datasetId,
  exportFileName = 'variants',
  variants,
  parentIdColumn,
}: VariantsProps) => {
  const table = useRef(null)
  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('variantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      return DEFAULT_COLUMNS
    }
  })

  const renderedTableColumns = useMemo(() => {
    const columnsForContext = getColumnsForContext(context, datasetId)
    if ((columnsForContext as any).clinical_significance) {
      ;(
        columnsForContext as any
      ).clinical_significance.description = `ClinVar germline classification, formerly called clinical significance. Based on ClinVar's ${formatClinvarDate(
        clinvarReleaseDate
      )} release`
    }

    return (
      ['variant_id', ...selectedColumns]
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        .map((columnKey) => columnsForContext[columnKey])
        .filter(Boolean)
        .map((column) => ({
          ...column,
          isSortable: Boolean(column.compareFunction),
          tooltip: column.description,
        }))
    )
  }, [clinvarReleaseDate, context, selectedColumns, datasetId])

  const [filter, setFilter] = useState<VariantFilterState>({
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
  })

  const [expandedEnvelopingTRIds, setExpandedEnvelopingTRIds] = useState<string[]>([])

  const [sortState, setSortState] = useState<SortState>({
    sortKey: 'variant_id',
    sortOrder: 'ascending',
  })
  const { sortKey, sortOrder } = sortState

  const setSortKey = useCallback((newSortKey: string) => {
    setSortState((prevSortState) => {
      if (newSortKey === prevSortState.sortKey) {
        return {
          sortKey: newSortKey,
          sortOrder: prevSortState.sortOrder === 'ascending' ? 'descending' : 'ascending',
        }
      }

      return {
        sortKey: newSortKey,
        sortOrder: 'descending',
      }
    })
  }, [])

  const filteredVariants = useMemo(() => {
    return isLongRead(datasetId)
      ? filterCollapsedEnvelopedVariants(variants as LongReadVariant[], expandedEnvelopingTRIds) // TK make regular filters work with LR
      : mergeExomeAndGenomeData({
          datasetId,
          variants: filterVariants(variants as Variant[], filter, renderedTableColumns),
          preferJointData: filter.includeExomes && filter.includeGenomes,
        })
  }, [datasetId, variants, filter, renderedTableColumns, expandedEnvelopingTRIds])

  const renderedVariants = useMemo(() => {
    return sortVariants(filteredVariants, sortState, parentIdColumn)
  }, [filteredVariants, sortState, parentIdColumn])

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)

  const onHoverVariantsInTrack = useMemo(
    () =>
      throttle((hoveredVariants: any) => {
        setVariantHoveredInTrack(hoveredVariants.length > 0 ? hoveredVariants[0].variant_id : null)
      }, 100),
    []
  )

  const onVisibleRowsChange = useMemo(
    () =>
      throttle(({ startIndex, stopIndex }: any) => {
        setVisibleVariantWindow([startIndex, stopIndex])
      }, 100),
    []
  )

  const [positionLastClicked, setPositionLastClicked] = useState(null)
  const createCallback = useCallback(
    (sortByKey: string, stateSetter: any) => (position: number) => {
      setSortState({
        sortKey: sortByKey,
        sortOrder: 'ascending',
      })
      stateSetter(position)
    },
    []
  )

  const onNavigatorClick = createCallback('variant_id', setPositionLastClicked)
  const onSearchResult = createCallback('variant_id', setFilter)
  const onExpandChildVariants = (variantId: string) => {
    if (expandedEnvelopingTRIds.includes(variantId)) {
      setExpandedEnvelopingTRIds(expandedEnvelopingTRIds.filter((id) => id !== variantId))
    } else {
      setExpandedEnvelopingTRIds([...expandedEnvelopingTRIds, variantId])
    }
  }

  // When a user clicks on the bubble track, update the position in the variant table
  useEffect(() => {
    if (positionLastClicked === null || table.current === null) {
      return
    }

    let index
    if (renderedVariants.length === 0 || positionLastClicked < renderedVariants[0].pos) {
      index = 0
    }

    index = renderedVariants.findIndex(
      (variant: Variant, i: number) =>
        renderedVariants[i + 1] &&
        positionLastClicked >= variant.pos &&
        positionLastClicked <= renderedVariants[i + 1].pos
    )

    if (index === -1) {
      index = renderedVariants.length - 1
    }

    // @ts-expect-error TS(2339) FIXME: 'scrollToDataRow' does not exist on type 'never'.
    table.current.scrollToDataRow(index)
  }, [positionLastClicked]) // eslint-disable-line react-hooks/exhaustive-deps

  // When searching the table with context, scroll to the first hit whenever the
  //   search text changes
  useEffect(() => {
    if (!filter.includeContext) {
      return
    }

    if (filter.searchText === '') {
      setCurrentSearchIndex(-1)
      return
    }

    const searchIndex = getFirstIndexFromSearchText(
      filter,
      renderedVariants,
      renderedTableColumns,
      visibleVariantWindow
    )

    if (searchIndex !== -1) {
      setCurrentSearchIndex(searchIndex)
    }

    // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
    table.current.scrollToDataRow(searchIndex)
  }, [filter.searchText]) // eslint-disable-line react-hooks/exhaustive-deps

  const datasetLabel = labelForDataset(datasetId)

  if (variants.length === 0) {
    return (
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
        <p>No gnomAD variants found.</p>
      </TrackPageSection>
    )
  }

  return (
    <div>
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
      </TrackPageSection>
      <Cursor onClick={onNavigatorClick}>
        <VariantTrack
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          title={`${datasetLabel} variants (${renderedVariants.length})`}
          variants={renderedVariants}
        />

        <VariantTrack
          // @ts-expect-error TS(2769) FIXME: No overload matches this call.
          title="Viewing in table"
          variants={renderedVariants
            .slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)
            .map((variant: any) => ({
              ...variant,
              isHighlighted: variant.variant_id === variantHoveredInTable,
            }))}
          onHoverVariants={onHoverVariantsInTrack}
        />
      </Cursor>

      <PositionAxisTrack />

      <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
        <VariantFilterControls
          onChange={setFilter}
          value={filter}
          jumpToRow={onSearchResult}
          position={currentSearchIndex}
        />
        <div>
          <ExportVariantsButton
            datasetId={datasetId}
            exportFileName={exportFileName}
            variants={renderedVariants}
          />

          <Button
            onClick={() => {
              setShowTableConfigurationModal(true)
            }}
            style={{ marginLeft: '1ch' }}
          >
            Configure table
          </Button>
        </div>
        {children}

        <div
          style={{
            // Keep the height of the table section constant when filtering variants, avoid layout shift
            minHeight: '540px',
          }}
        >
          {renderedVariants.length ? (
            <VariantTable
              ref={table}
              columns={renderedTableColumns}
              highlightText={filter.searchText}
              highlightedVariantId={variantHoveredInTrack}
              onHoverVariant={setVariantHoveredInTable}
              onRequestSort={setSortKey}
              onVisibleRowsChange={onVisibleRowsChange}
              onExpandChildVariants={isLongRead(datasetId) ? onExpandChildVariants : undefined}
              sortKey={sortKey}
              sortOrder={sortOrder}
              variants={renderedVariants}
            />
          ) : (
            <StatusMessage>No matching variants</StatusMessage>
          )}
        </div>
      </TrackPageSection>

      {showTableConfigurationModal && (
        <VariantTableConfigurationModal
          availableColumns={variantTableColumns}
          context={context}
          defaultColumns={DEFAULT_COLUMNS}
          selectedColumns={selectedColumns}
          onCancel={() => {
            setShowTableConfigurationModal(false)
          }}
          onSave={(newSelectedColumns) => {
            setSelectedColumns(newSelectedColumns)
            setShowTableConfigurationModal(false)

            userPreferences
              .savePreference('variantTableColumns', newSelectedColumns)
              .then(null, (error: any) => {
                showNotification({
                  title: 'Error',
                  message: error.message,
                  status: 'error',
                })
              })
          }}
        />
      )}
    </div>
  )
}

Variants.defaultProps = variantsDefaultProps

export default Variants
