import { throttle } from 'lodash-es'
import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Button } from '@gnomad/ui'

import formatClinvarDate from '../ClinvarVariantsTrack/formatClinvarDate'
import { labelForDataset } from '../datasets'
import { showNotification } from '../Notifications'
import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import userPreferences from '../userPreferences'
import ExportVariantsButton from './ExportVariantsButton'
import filterVariants from './filterVariants'
import mergeExomeAndGenomeData from './mergeExomeAndGenomeData'
import VariantFilterControls from './VariantFilterControls'
import VariantTable from './VariantTable'
import variantTableColumns, { getColumnsForContext } from './variantTableColumns'
import VariantTableConfigurationModal from './VariantTableConfigurationModal'
import VariantTrack from './VariantTrack'

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

const sortVariants = (variants, { sortKey, sortOrder }) => {
  const sortColumn = variantTableColumns.find(column => column.key === sortKey)
  return [...variants].sort((v1, v2) => sortColumn.compareFunction(v1, v2, sortOrder))
}

const Variants = ({
  children,
  clinvarReleaseDate,
  context,
  datasetId,
  exportFileName,
  variants,
}) => {
  const table = useRef(null)

  const [selectedColumns, setSelectedColumns] = useState(() => {
    try {
      return userPreferences.getPreference('variantTableColumns') || DEFAULT_COLUMNS
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
    includeSNVs: true,
    includeIndels: true,
    includeExomes: true,
    includeGenomes: true,
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

  const filteredVariants = useMemo(() => {
    return mergeExomeAndGenomeData(filterVariants(variants, filter, renderedTableColumns))
  }, [variants, filter, renderedTableColumns])

  const renderedVariants = useMemo(() => {
    return sortVariants(filteredVariants, sortState)
  }, [filteredVariants, sortState])

  const [showTableConfigurationModal, setShowTableConfigurationModal] = useState(false)
  const [variantHoveredInTable, setVariantHoveredInTable] = useState(null)
  const [variantHoveredInTrack, setVariantHoveredInTrack] = useState(null)
  const [visibleVariantWindow, setVisibleVariantWindow] = useState([0, 19])

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
          title={`${datasetLabel} variants (${renderedVariants.length})`}
          variants={renderedVariants}
        />

        <VariantTrack
          title="Viewing in table"
          variants={renderedVariants
            .slice(visibleVariantWindow[0], visibleVariantWindow[1] + 1)
            .map(variant => ({
              ...variant,
              isHighlighted: variant.variant_id === variantHoveredInTable,
            }))}
          onHoverVariants={onHoverVariantsInTrack}
        />
      </Cursor>

      <PositionAxisTrack />

      <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
        <VariantFilterControls onChange={setFilter} value={filter} />
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
          onSave={newSelectedColumns => {
            setSelectedColumns(newSelectedColumns)
            setShowTableConfigurationModal(false)

            userPreferences
              .savePreference('variantTableColumns', newSelectedColumns)
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

Variants.propTypes = {
  children: PropTypes.node,
  clinvarReleaseDate: PropTypes.string.isRequired,
  context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  datasetId: PropTypes.string.isRequired,
  exportFileName: PropTypes.string,
  variants: PropTypes.arrayOf(PropTypes.object).isRequired,
}

Variants.defaultProps = {
  children: undefined,
  exportFileName: 'variants',
}

export default Variants
