import { throttle } from 'lodash-es'
import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { PositionAxisTrack } from '@gnomad/region-viewer'

import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
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
import StructrualVariantPropType from './MitochondrialVariantPropType'
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

const sortMitochondrialVariants = (variants, { sortKey, sortOrder }) => {
  const sortColumn = mitochondrialVariantTableColumns.find(column => column.key === sortKey)
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

const MitochondrialVariants = ({ clinvarReleaseDate, context, exportFileName, variants }) => {
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
    if (columnsForContext.clinical_significance) {
      columnsForContext.clinical_significance.description = `ClinVar clinical significance, based on ClinVar's ${formatClinvarDate(
        clinvarReleaseDate
      )} release`
    }

    return ['variant_id', ...selectedColumns]
      .map(columnKey => columnsForContext[columnKey])
      .filter(Boolean)
      .map(column => ({
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

  const [sortState, setSortState] = useState({
    sortKey: 'variant_id',
    sortOrder: 'ascending',
  })
  const { sortKey, sortOrder } = sortState

  const setSortKey = useCallback(newSortKey => {
    setSortState(prevSortState => {
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
  const renderedVariants = useMemo(() => sortMitochondrialVariants(filteredVariants, sortState), [
    filteredVariants,
    sortState,
  ])

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])

  const shouldHighlightTableRow = useCallback(
    variant => {
      return variant.variant_id === variantHoveredInTrack
    },
    [variantHoveredInTrack]
  )

  const onHoverVariantsInTrack = useMemo(
    () =>
      throttle(hoveredVariants => {
        setVariantHoveredInTrack(hoveredVariants.length > 0 ? hoveredVariants[0].variant_id : null)
      }, 100),
    []
  )

  const onVisibleRowsChange = useMemo(
    () =>
      throttle(({ startIndex, stopIndex }) => {
        setVisibleVariantWindow([startIndex, stopIndex])
      }, 100),
    []
  )

  const [positionLastClicked, setPositionLastClicked] = useState(null)
  const onNavigatorClick = useCallback(position => {
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
      (variant, i) =>
        renderedVariants[i + 1] &&
        positionLastClicked >= variant.pos &&
        positionLastClicked <= renderedVariants[i + 1].pos
    )

    if (index === -1) {
      index = renderedVariants.length - 1
    }

    table.current.scrollToDataRow(index)
  }, [positionLastClicked]) // eslint-disable-line react-hooks/exhaustive-deps

  if (variants.length === 0) {
    return (
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
        <p>No gnomAD variants found.</p>
      </TrackPageSection>
    )
  }

  const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

  return (
    <div>
      <TrackPageSection>
        <h2 style={{ margin: '2em 0 0.25em' }}>gnomAD variants</h2>
      </TrackPageSection>
      <Wrapper>
        <Cursor onClick={onNavigatorClick}>
          <VariantTrack
            title={`gnomAD variants\n(${renderedVariants.length})`}
            variants={renderedVariants.map(variant => ({
              ...variant,
              allele_freq: variant.af,
            }))}
          />

          <VariantTrack
            title="Viewing in table"
            variants={renderedVariants
              .slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)
              .map(variant => ({
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
            <StatusMessage>No matching variants</StatusMessage>
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
          onSave={newSelectedColumns => {
            setSelectedColumns(newSelectedColumns)
            setShowTableConfigurationModal(false)

            userPreferences
              .savePreference('mitochondrialVariantTableColumns', newSelectedColumns)
              .then(null, error => {
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

MitochondrialVariants.propTypes = {
  clinvarReleaseDate: PropTypes.string.isRequired,
  context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  exportFileName: PropTypes.string.isRequired,
  variants: PropTypes.arrayOf(StructrualVariantPropType).isRequired,
}

export default MitochondrialVariants
