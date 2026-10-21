import { throttle } from 'lodash-es'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { PositionAxisTrack } from '@gnomad/region-viewer'

import ClinvarVariants from '../ClinvarVariantsTrack/ClinvarVariantTrack'
import useClinvarVariantFiltering from '../ClinvarVariantsTrack/useClinvarVariantFiltering'
import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { selectLinkedVariants } from '../VariantList/useLinkedVariantSelection'
import VariantSyncControl, { NO_SHARED_VARIANTS_MESSAGE } from '../VariantList/VariantSyncControl'
import { showNotification } from '../Notifications'
import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import userPreferences from '../userPreferences'
import VariantTableConfigurationModal from '../VariantList/VariantTableConfigurationModal'
import VariantTrack from '../VariantList/VariantTrack'

import ExportMitochondrialVariantsButton from './ExportMitochondrialVariantsButton'
import filterMitochondrialVariants from './filterMitochondrialVariants'
import MitochondrialVariantFilterControls from './MitochondrialVariantFilterControls'
import mitochondrialVariantTableColumns, {
  getColumnsForContext,
} from './mitochondrialVariantTableColumns'
import MitochondrialVariantsTable from './MitochondrialVariantsTable'

const NUM_ROWS_RENDERED = 20

const Wrapper = styled.div`
  margin-bottom: 1em;
`

const DEFAULT_COLUMNS = [
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

const sortMitochondrialVariants = (variants: any, { sortKey, sortOrder }: any) => {
  const sortColumn = mitochondrialVariantTableColumns.find((column: any) => column.key === sortKey)
  // @ts-expect-error TS(2532) FIXME: Object is possibly 'undefined'.
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

type MitochondrialVariantsProps = {
  clinvarReleaseDate: string
  context: any
  exportFileName: string
  // @ts-expect-error TS(2749) FIXME: 'StructrualVariantPropType' refers to a value, but... Remove this comment to see the full error message
  variants: StructrualVariantPropType[]
  clinvar?: Pick<
    React.ComponentProps<typeof ClinvarVariants>,
    'clinvarVariants' | 'referenceGenome' | 'transcripts' | 'pageType'
  >
}

const MitochondrialVariants = ({
  clinvarReleaseDate,
  context,
  exportFileName,
  variants,
  clinvar,
}: MitochondrialVariantsProps) => {
  const table = useRef(null)

  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('mitochondrialVariantTableColumns') || DEFAULT_COLUMNS
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
    searchText: '',
  })

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

  const filteredVariants = useMemo(
    () => filterMitochondrialVariants(variants, filter, renderedTableColumns),
    [variants, filter, renderedTableColumns]
  )
  const [syncEnabled, setSyncEnabled] = useState(false)
  const syncAvailable = clinvar?.clinvarVariants !== null && clinvar?.clinvarVariants !== undefined
  const clinvarSelection = useClinvarVariantFiltering(clinvar?.clinvarVariants ?? [])
  const selected = useMemo(() => {
    return selectLinkedVariants(
      clinvarSelection.filteredVariants,
      filteredVariants,
      syncEnabled && syncAvailable
    )
  }, [clinvarSelection.filteredVariants, filteredVariants, syncEnabled, syncAvailable])
  const sync = useMemo(
    () => ({ enabled: syncEnabled, available: syncAvailable, onChange: setSyncEnabled }),
    [syncEnabled, syncAvailable]
  )
  const linkedClinvarSelection = useMemo(
    () => ({
      filter: clinvarSelection.filter,
      setFilter: clinvarSelection.setFilter,
      filteredVariants: selected.clinvar,
    }),
    [clinvarSelection.filter, clinvarSelection.setFilter, selected.clinvar]
  )
  const renderedVariants = useMemo(
    () => sortMitochondrialVariants(selected.gnomad, sortState),
    [selected.gnomad, sortState]
  )
  const clinvarContent = clinvar && (
    <ClinvarVariants
      clinvarVariants={clinvar.clinvarVariants}
      clinvarReleaseDate={clinvarReleaseDate}
      referenceGenome={clinvar.referenceGenome}
      transcripts={clinvar.transcripts}
      pageType={clinvar.pageType}
      selection={linkedClinvarSelection}
      sync={sync}
    />
  )

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState<string | null>(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])

  const shouldHighlightTableRow = useCallback(
    (variant: { variant_id: string }) => {
      return variant.variant_id === variantHoveredInTrack
    },
    [variantHoveredInTrack]
  )

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

  const [positionLastClicked, setPositionLastClicked] = useState<number | null>(null)
  const onNavigatorClick = useCallback((position: number) => {
    setSortState({
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })
    setPositionLastClicked(position)
  }, [])

  useEffect(() => {
    if (positionLastClicked === null) {
      return
    }

    let index
    if (renderedVariants.length === 0 || positionLastClicked < renderedVariants[0].pos) {
      index = 0
    }

    index = renderedVariants.findIndex(
      (variant: any, i: any) =>
        renderedVariants[i + 1] &&
        positionLastClicked >= variant.pos &&
        positionLastClicked <= renderedVariants[i + 1].pos
    )

    if (index === -1) {
      index = renderedVariants.length - 1
    }

    // @ts-expect-error TS(2531) FIXME: Object is possibly 'null'.
    table.current.scrollToDataRow(index)
  }, [positionLastClicked]) // eslint-disable-line react-hooks/exhaustive-deps

  if (variants.length === 0) {
    return (
      <>
        {clinvarContent}
        <TrackPageSection>
          <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
          {clinvar && <VariantSyncControl id="gnomad-variant-sync" state={sync} />}
          <p>No gnomAD variants found.</p>
        </TrackPageSection>
      </>
    )
  }

  const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)
  const noMatchingVariantsMessage =
    syncEnabled && syncAvailable ? NO_SHARED_VARIANTS_MESSAGE : 'No matching variants'

  return (
    <div>
      {clinvarContent}
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
      </TrackPageSection>
      <Wrapper>
        <Cursor onClick={onNavigatorClick}>
          <VariantTrack
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            title={`gnomAD variants\n(${renderedVariants.length})`}
            variants={renderedVariants.map((variant) => ({
              ...variant,
              allele_freq: variant.af,
            }))}
          />

          <VariantTrack
            // @ts-expect-error TS(2769) FIXME: No overload matches this call.
            title="Viewing in table"
            variants={renderedVariants
              .slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)
              .map((variant) => ({
                ...variant,
                allele_freq: variant.af,
                isHighlighted: variant.variant_id === variantHoveredInTable,
              }))}
            onHoverVariants={onHoverVariantsInTrack}
          />
        </Cursor>
        <PositionAxisTrack />
      </Wrapper>
      <TrackPageSection style={{ fontSize: '14px' }}>
        <Wrapper>
          <MitochondrialVariantFilterControls value={filter} onChange={setFilter} />
          {clinvar && <VariantSyncControl id="gnomad-variant-sync" state={sync} />}
          <div>
            <ExportMitochondrialVariantsButton
              exportFileName={exportFileName}
              includeGene={context.gene_id === undefined && context.transcript_id === undefined} // eslint-disable-line react/destructuring-assignment
              variants={renderedVariants}
            />
          </div>
        </Wrapper>
        <Wrapper
          style={{
            // Keep the height of the table section constant when filtering variants, avoid layout shift
            minHeight: 55 + 25 * Math.min(variants.length, NUM_ROWS_RENDERED),
          }}
        >
          {renderedVariants.length ? (
            <MitochondrialVariantsTable
              ref={table}
              // @ts-expect-error TS(2322) FIXME: Type '{ ref: MutableRefObject<null>; columns: any[... Remove this comment to see the full error message
              columns={renderedTableColumns}
              highlightText={filter.searchText}
              numRowsRendered={numRowsRendered}
              shouldHighlightRow={shouldHighlightTableRow}
              sortKey={sortKey}
              sortOrder={sortOrder}
              variants={renderedVariants}
              onHoverVariant={setVariantHoveredInTable}
              onRequestSort={setSortKey}
              onVisibleRowsChange={onVisibleRowsChange}
            />
          ) : (
            <StatusMessage>{noMatchingVariantsMessage}</StatusMessage>
          )}
        </Wrapper>
      </TrackPageSection>

      {showTableConfigurationModal && (
        <VariantTableConfigurationModal
          availableColumns={mitochondrialVariantTableColumns}
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
              .savePreference('mitochondrialVariantTableColumns', newSelectedColumns)
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

export default MitochondrialVariants
