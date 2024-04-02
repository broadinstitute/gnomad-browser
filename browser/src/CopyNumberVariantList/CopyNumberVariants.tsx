import React, { useCallback, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'

import { showNotification } from '../Notifications'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import userPreferences from '../userPreferences'
import VariantTableConfigurationModal from '../VariantList/VariantTableConfigurationModal'

import ExportCopyNumberVariantsButton from './ExportCopyNumberVariantsButton'
import filterCopyNumberVariants from './filterCopyNumberVariants'
import CopyNumberVariantFilterControls from './CopyNumberVariantFilterControls'

import { cnvTypeColors } from './copyNumberVariantTypes'
import CopyNumberVariantPropType from './CopyNumberVariantPropType'
import copyNumberVariantTableColumns, {
  getColumnsForContext,
} from './copyNumberVariantTableColumns'
import CopyNumberVariantsTable from './CopyNumberVariantsTable'
import CopyNumberVariantTracks from './CopyNumberVariantTracks'

const NUM_ROWS_RENDERED = 20
const TRACK_HEIGHT = 14
const TABLE_ROW_HEIGHT = 25

const Wrapper = styled.div`
  margin-bottom: 1em;
`

const HUMAN_CHROMOSOMES = [...Array.from(new Array(22), (x: any, i: any) => `${i + 1}`), 'X', 'Y']

const DEFAULT_COLUMNS = ['source', 'class', 'pos', 'length', 'sc', 'sn', 'sf']

const sortVariants = (variants: any, { sortKey, sortOrder }: any) => {
  const sortColumn = copyNumberVariantTableColumns.find((column: any) => column.key === sortKey)
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

export interface Context {
  chrom: string
}

type CopyNumberVariantsProps = {
  context: Context
  exportFileName: string
  variants: CopyNumberVariantPropType[]
}

const CopyNumberVariants = ({ context, exportFileName, variants }: CopyNumberVariantsProps) => {
  const table = useRef(null)
  const tracks = useRef(null)

  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('copyNumberVariantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      return DEFAULT_COLUMNS
    }
  })

  const renderedTableColumns = useMemo(() => {
    const columnsForContext = getColumnsForContext(context)
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
  }, [context, selectedColumns])

  const [filter, setFilter] = useState({
    includeTypes: {
      DEL: true,
      DUP: true,
    },
    includeFilteredVariants: false,
    searchText: '',
  })

  const [sortState, setSortState] = useState({
    sortKey: 'variant_id',
    sortOrder: 'ascending',
  })
  const { sortKey, sortOrder } = sortState

  const setSortKey = useCallback((newSortKey) => {
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

  const filteredVariants = useMemo(
    () => filterCopyNumberVariants(variants, filter, renderedTableColumns),
    [variants, filter, renderedTableColumns]
  )

  const renderedVariants = useMemo(
    () => sortVariants(filteredVariants, sortState),
    [filteredVariants, sortState]
  )

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)

  const shouldHighlightTableRow = useCallback(
    (variant) => {
      return variant.variant_id === variantHoveredInTrack
    },
    [variantHoveredInTrack]
  )

  const onScrollTable = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (tracks.current && !scrollUpdateWasRequested) {
      ;(tracks.current as any).scrollTo(
        Math.round(scrollOffset * (TRACK_HEIGHT / TABLE_ROW_HEIGHT))
      )
    }
  }, [])

  const onScrollTracks = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (table.current && !scrollUpdateWasRequested) {
      ;(table.current as any).scrollTo(Math.round(scrollOffset * (TABLE_ROW_HEIGHT / TRACK_HEIGHT)))
    }
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [colorKey, setColorKey] = useState('type')
  const trackColor = useCallback(
    // eslint-disable-next-line consistent-return
    (variant) => {
      if (colorKey === 'type') {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return cnvTypeColors[variant.type]
      }
    },
    [colorKey]
  )

  if (variants.length === 0) {
    return <StatusMessage>No variants found</StatusMessage>
  }

  const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

  // pos/end and pos2/end2 coordinates are based on the chromosome which they are located on.
  // If that chromosome is not the same as the one that the region viewer's coordinates
  // are based on, then offset the positions so that they are based on the
  // region viewer's coordinate system.
  const currentChromIndex = HUMAN_CHROMOSOMES.indexOf(context.chrom) // eslint-disable-line react/destructuring-assignment
  const positionCorrectedVariants = renderedVariants.map((variant) => {
    const copy = { ...variant }

    // This can only happen when chrom2/pos2/end2 is non-null
    if (variant.chrom2) {
      const chromIndex = HUMAN_CHROMOSOMES.indexOf(variant.chrom)
      copy.pos += (chromIndex - currentChromIndex) * 1e9
      copy.end += (chromIndex - currentChromIndex) * 1e9
    }

    return copy
  })

  return (
    <div>
      <Wrapper>
        <CopyNumberVariantTracks
          ref={tracks}
          // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; highlightedVa... Remove this comment to see the full error message
          highlightedVariant={variantHoveredInTable}
          numTracksRendered={numRowsRendered}
          onHover={setVariantHoveredInTrack}
          onScroll={onScrollTracks}
          trackColor={trackColor}
          trackHeight={TRACK_HEIGHT}
          variants={positionCorrectedVariants}
        />
      </Wrapper>
      <Wrapper>
        <PositionAxisTrack />
      </Wrapper>
      <TrackPageSection style={{ fontSize: '14px' }}>
        <Wrapper>
          <div>
            <CopyNumberVariantFilterControls
              // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type '"type" | ... Remove this comment to see the full error message
              colorKey={colorKey}
              value={filter}
              onChange={setFilter}
            />
            <ExportCopyNumberVariantsButton
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
        </Wrapper>
        <Wrapper
          style={{
            // Keep the height of the table section constant when filtering variants, avoid layout shift
            minHeight: 40 + TABLE_ROW_HEIGHT * Math.min(variants.length, NUM_ROWS_RENDERED),
          }}
        >
          {renderedVariants.length ? (
            <CopyNumberVariantsTable
              ref={table}
              // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; cellData: { c... Remove this comment to see the full error message
              cellData={{
                colorKey,
                highlightWords: filter.searchText
                  .split(',')
                  .map((s) => s.trim())
                  .filter((term) => term !== ''),
              }}
              columns={renderedTableColumns}
              numRowsRendered={numRowsRendered}
              onHoverVariant={setVariantHoveredInTable}
              onRequestSort={setSortKey}
              onScroll={onScrollTable}
              rowHeight={TABLE_ROW_HEIGHT}
              shouldHighlightRow={shouldHighlightTableRow}
              sortKey={sortKey}
              sortOrder={sortOrder}
              variants={renderedVariants}
            />
          ) : (
            <StatusMessage>No matching variants</StatusMessage>
          )}
        </Wrapper>
      </TrackPageSection>

      {showTableConfigurationModal && (
        <VariantTableConfigurationModal
          availableColumns={copyNumberVariantTableColumns}
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
              .savePreference('copyNumberVariantTableColumns', newSelectedColumns)
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

export default CopyNumberVariants
