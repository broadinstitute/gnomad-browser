import React, { useCallback, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

// @ts-expect-error TS(7016) FIXME: Could not find a declaration file for module '@gno... Remove this comment to see the full error message
import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button, SegmentedControl } from '@gnomad/ui'

import { showNotification } from '../Notifications'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import userPreferences from '../userPreferences'
import VariantTableConfigurationModal from '../VariantList/VariantTableConfigurationModal'

import ExportStructuralVariantsButton from './ExportStructuralVariantsButton'
import filterStructuralVariants from './filterStructuralVariants'
import {
  svConsequenceCategories,
  svConsequenceCategoryColors,
} from './structuralVariantConsequences'
import { svTypeColors } from './structuralVariantTypes'
import StructuralVariantFilterControls from './StructuralVariantFilterControls'
import StructrualVariantPropType from './StructuralVariantPropType'
import structuralVariantTableColumns, {
  getColumnsForContext,
} from './structuralVariantTableColumns'
import StructuralVariantsTable from './StructuralVariantsTable'
import StructuralVariantTracks from './StructuralVariantTracks'

const NUM_ROWS_RENDERED = 20
const TRACK_HEIGHT = 14
const TABLE_ROW_HEIGHT = 25

const Wrapper = styled.div`
  margin-bottom: 1em;
`

const ControlWrapper = styled(Wrapper)`
  display: flex;
  justify-content: flex-end;
  align-items: center;

  @media (min-width: 900px) {
    margin-right: 160px;
  }
`

const HUMAN_CHROMOSOMES = [...Array.from(new Array(22), (x: any, i: any) => `${i + 1}`), 'X', 'Y']

const DEFAULT_COLUMNS = [
  'source',
  'consequence',
  'class',
  'pos',
  'length',
  'ac',
  'an',
  'af',
  'homozygote_count',
]

const sortVariants = (variants: any, { sortKey, sortOrder }: any) => {
  const sortColumn = structuralVariantTableColumns.find((column: any) => column.key === sortKey)
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

type StructuralVariantsProps = {
  context: any
  exportFileName: string
  variants: StructrualVariantPropType[]
}

const StructuralVariants = ({ context, exportFileName, variants }: StructuralVariantsProps) => {
  const table = useRef(null)
  const tracks = useRef(null)

  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('structuralVariantTableColumns') || DEFAULT_COLUMNS
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
    includeConsequenceCategories: {
      lof: true,
      dup_lof: true,
      copy_gain: true,
      other: true,
    },
    includeTypes: {
      DEL: true,
      DUP: true,
      MCNV: true,
      INS: true,
      INV: true,
      CPX: true,
      OTH: true,
    },
    includeFilteredVariants: false,
    searchText: '',
  })

  const [sortState, setSortState] = useState({
    sortKey: 'variant_id',
    sortOrder: 'ascending',
  })
  const { sortKey, sortOrder } = sortState

  // @ts-expect-error TS(7006) FIXME: Parameter 'newSortKey' implicitly has an 'any' typ... Remove this comment to see the full error message
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
    () => filterStructuralVariants(variants, filter, renderedTableColumns),
    [variants, filter, renderedTableColumns]
  )
  const renderedVariants = useMemo(() => sortVariants(filteredVariants, sortState), [
    filteredVariants,
    sortState,
  ])

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)

  const shouldHighlightTableRow = useCallback(
    // @ts-expect-error TS(7006) FIXME: Parameter 'variant' implicitly has an 'any' type.
    (variant) => {
      return variant.variant_id === variantHoveredInTrack
    },
    [variantHoveredInTrack]
  )

  // @ts-expect-error TS(7031) FIXME: Binding element 'scrollOffset' implicitly has an '... Remove this comment to see the full error message
  const onScrollTable = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (tracks.current && !scrollUpdateWasRequested) {
      ;(tracks.current as any).scrollTo(
        Math.round(scrollOffset * (TRACK_HEIGHT / TABLE_ROW_HEIGHT))
      )
    }
  }, [])

  // @ts-expect-error TS(7031) FIXME: Binding element 'scrollOffset' implicitly has an '... Remove this comment to see the full error message
  const onScrollTracks = useCallback(({ scrollOffset, scrollUpdateWasRequested }) => {
    if (table.current && !scrollUpdateWasRequested) {
      ;(table.current as any).scrollTo(Math.round(scrollOffset * (TABLE_ROW_HEIGHT / TRACK_HEIGHT)))
    }
  }, [])

  const [colorKey, setColorKey] = useState('consequence')
  const trackColor = useCallback(
    // @ts-expect-error TS(7006) FIXME: Parameter 'variant' implicitly has an 'any' type.
    (variant) => {
      if (colorKey === 'type') {
        // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return svTypeColors[variant.type] || svTypeColors.OTH
      }
      return variant.consequence
        ? // @ts-expect-error TS(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
          svConsequenceCategoryColors[svConsequenceCategories[variant.consequence]]
        : svConsequenceCategoryColors.other
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
      const endChromIndex = HUMAN_CHROMOSOMES.indexOf(variant.chrom2)

      copy.pos += (chromIndex - currentChromIndex) * 1e9
      copy.end += (chromIndex - currentChromIndex) * 1e9

      copy.pos2 += (endChromIndex - currentChromIndex) * 1e9
      copy.end2 += (endChromIndex - currentChromIndex) * 1e9
    }

    return copy
  })

  return (
    <div>
      <ControlWrapper>
        <span style={{ marginRight: '0.5em' }}>Color variants by</span>
        <SegmentedControl
          id="sv-color-key"
          options={[
            { label: 'Consequence', value: 'consequence' },
            { label: 'Class', value: 'type' },
          ]}
          value={colorKey}
          onChange={setColorKey}
        />
      </ControlWrapper>
      <Wrapper>
        <StructuralVariantTracks
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
          <StructuralVariantFilterControls
            // @ts-expect-error TS(2322) FIXME: Type 'string' is not assignable to type '"type" | ... Remove this comment to see the full error message
            colorKey={colorKey}
            value={filter}
            onChange={setFilter}
          />
          <div>
            <ExportStructuralVariantsButton
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
            <StructuralVariantsTable
              ref={table}
              // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; cellData: { c... Remove this comment to see the full error message
              cellData={{
                colorKey,
                highlightWords: filter.searchText.split(',').map((s) => s.trim()),
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
          availableColumns={structuralVariantTableColumns}
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
              .savePreference('structuralVariantTableColumns', newSelectedColumns)
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

export default StructuralVariants
