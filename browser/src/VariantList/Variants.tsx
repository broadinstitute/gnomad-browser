import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'

import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import { FIND_NO_OVERLAY_ATTRIBUTE, useFindBar } from '../FindBar/FindBarContext'
import useVariantFindBridge from '../FindBar/useVariantFindBridge'
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

const DEFAULT_COLUMNS = [
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

const sortVariants = (variants: any, { sortKey, sortOrder }: any) => {
  const sortColumn = variantTableColumns.find((column: any) => column.key === sortKey)
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

type OwnVariantsProps = {
  children?: any
  clinvarReleaseDate: string
  context: Gene
  datasetId: DatasetId
  exportFileName?: string
  variants: Variant[]
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

const Variants = ({
  children,
  clinvarReleaseDate,
  context,
  datasetId,
  exportFileName,
  variants,
}: VariantsProps) => {
  const table = useRef<any>(null)

  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('variantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      return DEFAULT_COLUMNS
    }
  })

  const renderedTableColumns = useMemo(() => {
    const columnsForContext = getColumnsForContext(context)
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
  }, [clinvarReleaseDate, context, selectedColumns])

  const [filter, setFilter] = useState({
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

  // The find bar (Ctrl/Cmd+F) drives the variant search — applied to the filter
  // for searching/highlighting/scrolling, but NOT written into the on-page
  // "Search variant table" box, which keeps the user's own manual search.
  const { isOpen: findBarOpen, query: findQuery, registerVariantFind } = useFindBar()

  // The find bar is actively driving the search (vs. the user's manual box text).
  const findBarDriving = findBarOpen && findQuery !== ''

  // Search text used for filtering: the find query while open, else the box text.
  const effectiveSearchText = findBarDriving ? findQuery : filter.searchText

  const effectiveFilter = useMemo(
    () => ({ ...filter, searchText: effectiveSearchText }),
    [filter, effectiveSearchText]
  )

  const [sortState, setSortState] = useState({
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
    return mergeExomeAndGenomeData({
      datasetId,
      variants: filterVariants(variants, effectiveFilter, renderedTableColumns),
      preferJointData: effectiveFilter.includeExomes && effectiveFilter.includeGenomes,
    })
  }, [datasetId, variants, effectiveFilter, renderedTableColumns])

  const renderedVariants = useMemo(() => {
    return sortVariants(filteredVariants, sortState)
  }, [filteredVariants, sortState])

  // Indices (into renderedVariants) of every matching variant, across the whole
  // list — not just the rendered rows.
  const matchRowIndices = useMemo(() => {
    if (effectiveSearchText === '') {
      return []
    }
    const matched = getFilteredVariants(effectiveFilter, renderedVariants, renderedTableColumns)
    const matchedIds = new Set(matched.map((variant: Variant) => variant.variant_id))
    const indices: number[] = []
    renderedVariants.forEach((variant: Variant, index: number) => {
      if (matchedIds.has(variant.variant_id)) {
        indices.push(index)
      }
    })
    return indices
  }, [effectiveFilter, effectiveSearchText, renderedVariants, renderedTableColumns])

  const variantSearchMatchCount = matchRowIndices.length

  useVariantFindBridge({ matchCount: variantSearchMatchCount })

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)

  // Register the table as the find bar's variant-find provider: map a match
  // index to its row and let the table scroll to / highlight it. Refs keep the
  // stable callbacks reading the latest matches.
  const matchRowIndicesRef = useRef(matchRowIndices)
  matchRowIndicesRef.current = matchRowIndices
  const renderedVariantsRef = useRef(renderedVariants)
  renderedVariantsRef.current = renderedVariants

  useEffect(() => {
    registerVariantFind({
      focusMatch: (index: number) => {
        const rows = matchRowIndicesRef.current
        if (index < 0 || index >= rows.length) {
          return
        }
        const rowIndex = rows[index]
        const variantId = (renderedVariantsRef.current[rowIndex] as Variant)?.variant_id ?? null
        table.current?.focusMatch(rowIndex, variantId)
      },
      clearMatch: () => table.current?.clearMatch(),
    })
    return () => registerVariantFind(null)
  }, [registerVariantFind])

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

    table.current.scrollToDataRow(index)
  }, [positionLastClicked]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manual search box (find bar not driving): scroll to the first hit when the
  // search text changes. The find bar drives its own navigation below.
  useEffect(() => {
    if (findBarDriving || !effectiveFilter.includeContext) {
      return
    }

    if (effectiveSearchText === '') {
      setCurrentSearchIndex(-1)
      return
    }

    const searchIndex = getFirstIndexFromSearchText(
      effectiveFilter,
      renderedVariants,
      renderedTableColumns,
      visibleVariantWindow
    )

    if (searchIndex !== -1) {
      setCurrentSearchIndex(searchIndex)
    }

    table.current.scrollToDataRow(searchIndex)
  }, [findBarDriving, effectiveSearchText]) // eslint-disable-line react-hooks/exhaustive-deps

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
            .map((variant) => ({
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
          searchDisabled={findBarOpen}
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
          // The table highlights its own matches; opt out of the find overlay.
          {...{ [FIND_NO_OVERLAY_ATTRIBUTE]: true }}
          style={{
            // Keep the height of the table section constant when filtering variants, avoid layout shift
            minHeight: '540px',
          }}
        >
          {renderedVariants.length ? (
            <VariantTable
              ref={table}
              columns={renderedTableColumns}
              highlightText={effectiveSearchText}
              highlightedVariantId={variantHoveredInTrack}
              onHoverVariant={setVariantHoveredInTable}
              onRequestSort={setSortKey}
              onVisibleRowsChange={onVisibleRowsChange}
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
