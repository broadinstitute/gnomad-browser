import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'

import { DatasetId, labelForDataset } from '@gnomad/dataset-metadata/metadata'
import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import ExportVariantsButton from './ExportVariantsButton'
import { VariantFiltering, VariantFilterState, getFilteredVariants } from './useVariantFiltering'
import VariantFilterControls from './VariantFilterControls'
import VariantTable from './VariantTable'
import variantTableColumns, { DEFAULT_COLUMNS } from './variantTableColumns'
import VariantTableConfigurationModal from './VariantTableConfigurationModal'
import VariantTrack from './VariantTrack'
import { Variant } from '../VariantPage/VariantPage'
import { VariantTableContext } from './VariantTableContext'
import VariantSyncControl, {
  NO_SHARED_VARIANTS_MESSAGE,
  VariantSyncState,
} from './VariantSyncControl'

const sortVariants = (variants: any, { sortKey, sortOrder }: any) => {
  const sortColumn = variantTableColumns.find((column: any) => column.key === sortKey)
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

type VariantsProps = {
  children?: any
  context: VariantTableContext
  datasetId: DatasetId
  exportFileName?: string
  selection: VariantFiltering
  sync?: VariantSyncState
}

export const getFirstIndexFromSearchText = (
  searchFilter: VariantFilterState,
  variantSearched: Variant[],
  variantsTableColumns: any,
  variantWindow: number[]
): number => {
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
  context,
  datasetId,
  exportFileName = 'variants',
  selection,
  sync,
}: VariantsProps) => {
  const table = useRef(null)
  const {
    variants,
    filter,
    setFilter,
    selectedColumns,
    saveSelectedColumns,
    renderedTableColumns,
    filteredVariants,
  } = selection

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

  const renderedVariants = useMemo(() => {
    return sortVariants(filteredVariants, sortState)
  }, [filteredVariants, sortState])

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

  const hasRenderedVariants = renderedVariants.length > 0

  useEffect(() => {
    if (filter.searchText === '') {
      setCurrentSearchIndex(-1)
      return
    }

    if (!filter.includeContext || !hasRenderedVariants) {
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
  }, [filter.searchText, hasRenderedVariants]) // eslint-disable-line react-hooks/exhaustive-deps

  const datasetLabel = labelForDataset(datasetId)

  if (variants.length === 0) {
    return (
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
        <p>No gnomAD variants found.</p>
        {sync && <VariantSyncControl id="gnomad-variant-sync" state={sync} />}
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
          sync={sync}
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
          <div hidden={renderedVariants.length === 0}>
            <VariantTable
              ref={table}
              columns={renderedTableColumns}
              highlightText={filter.searchText}
              highlightedVariantId={variantHoveredInTrack}
              onHoverVariant={setVariantHoveredInTable}
              onRequestSort={setSortKey}
              onVisibleRowsChange={onVisibleRowsChange}
              sortKey={sortKey}
              sortOrder={sortOrder}
              variants={renderedVariants}
            />
          </div>
          {renderedVariants.length === 0 && (
            <StatusMessage>
              {sync?.enabled && sync.available
                ? NO_SHARED_VARIANTS_MESSAGE
                : 'No matching variants'}
            </StatusMessage>
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
            saveSelectedColumns(newSelectedColumns)
            setShowTableConfigurationModal(false)
          }}
        />
      )}
    </div>
  )
}

export default Variants
