import { throttle } from 'lodash-es'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
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

class MitochondrialVariants extends Component {
  static propTypes = {
    clinvarReleaseDate: PropTypes.string.isRequired,
    context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    exportFileName: PropTypes.string.isRequired,
    variants: PropTypes.arrayOf(StructrualVariantPropType).isRequired,
  }

  constructor(props) {
    super(props)

    this.tracks = React.createRef()

    this.table = React.createRef()

    let selectedColumns
    try {
      selectedColumns =
        userPreferences.getPreference('mitochondrialVariantTableColumns') || DEFAULT_COLUMNS
    } catch (error) {
      selectedColumns = DEFAULT_COLUMNS
    }

    const columnsForContext = getColumnsForContext(props.context)
    if (columnsForContext.clinical_significance) {
      columnsForContext.clinical_significance.description = `ClinVar clinical significance, based on ClinVar's ${formatClinvarDate(
        props.clinvarReleaseDate
      )} release`
    }

    const renderedTableColumns = ['variant_id', ...selectedColumns]
      .map(columnKey => columnsForContext[columnKey])
      .filter(Boolean)
      .map(column => ({
        ...column,
        isSortable: Boolean(column.compareFunction),
        tooltip: column.description,
      }))

    const defaultFilter = {
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      includeFilteredVariants: false,
      searchText: '',
    }

    const defaultSortKey = 'variant_id'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortMitochondrialVariants(
      filterMitochondrialVariants(props.variants, defaultFilter, renderedTableColumns),
      {
        sortKey: defaultSortKey,
        sortOrder: defaultSortOrder,
      }
    )

    this.state = {
      filter: defaultFilter,
      renderedTableColumns,
      renderedVariants,
      selectedColumns,
      showTableConfigurationModal: false,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      variantHoveredInTable: null,
      variantHoveredInTrack: null,
      visibleVariantWindow: [0, 19],
    }
  }

  onFilter = newFilter => {
    this.setState(state => {
      const { variants } = this.props
      const { renderedTableColumns, sortKey, sortOrder } = state
      const renderedVariants = sortMitochondrialVariants(
        filterMitochondrialVariants(variants, newFilter, renderedTableColumns),
        {
          sortKey,
          sortOrder,
        }
      )
      return {
        filter: newFilter,
        renderedVariants,
      }
    })
  }

  onSort = newSortKey => {
    this.setState(state => {
      const { renderedVariants, sortKey } = state

      let newSortOrder = 'descending'
      if (newSortKey === sortKey) {
        newSortOrder = state.sortOrder === 'ascending' ? 'descending' : 'ascending'
      }

      // Since the filter hasn't changed, sort the currently rendered variants instead
      // of filtering the input variants.
      const sortedVariants = sortMitochondrialVariants(renderedVariants, {
        sortKey: newSortKey,
        sortOrder: newSortOrder,
      })

      return {
        renderedVariants: sortedVariants,
        sortKey: newSortKey,
        sortOrder: newSortOrder,
      }
    })
  }

  onHoverVariantInTable = variantId => {
    this.setState({ variantHoveredInTable: variantId })
  }

  onHoverVariantsInTrack = throttle(variants => {
    this.setState({
      variantHoveredInTrack: variants.length > 0 ? variants[0].variant_id : null,
    })
  }, 100)

  onVisibleRowsChange = throttle(({ startIndex, stopIndex }) => {
    this.setState({ visibleVariantWindow: [startIndex, stopIndex] })
  }, 100)

  onNavigatorClick = position => {
    const { renderedVariants } = this.state
    const sortedVariants = sortMitochondrialVariants(renderedVariants, {
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })

    let index
    if (sortedVariants.length === 0 || position < sortedVariants[0].pos) {
      index = 0
    }

    index = sortedVariants.findIndex(
      (variant, i) =>
        sortedVariants[i + 1] && position >= variant.pos && position <= sortedVariants[i + 1].pos
    )

    if (index === -1) {
      index = sortedVariants.length - 1
    }

    this.setState(
      {
        renderedVariants: sortedVariants,
        sortKey: 'variant_id',
        sortOrder: 'ascending',
      },
      () => {
        if (this.table.current) {
          this.table.current.scrollToDataRow(index)
        }
      }
    )
  }

  shouldHighlightTableRow = variant => {
    const { variantHoveredInTrack } = this.state
    return variant.variant_id === variantHoveredInTrack
  }

  render() {
    const { context, exportFileName, variants } = this.props
    const {
      filter,
      renderedTableColumns,
      renderedVariants,
      selectedColumns,
      showTableConfigurationModal,
      sortKey,
      sortOrder,
      variantHoveredInTable,
      visibleVariantWindow,
    } = this.state

    if (variants.length === 0) {
      return (
        <>
          <h2 style={{ margin: '2em 0 0.25em 115px' }}>gnomAD variants</h2>
          <TrackPageSection>
            <p>No gnomAD variants found.</p>
          </TrackPageSection>
        </>
      )
    }

    const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

    return (
      <div>
        <h2 style={{ margin: '2em 0 0.25em 115px' }}>gnomAD variants</h2>
        <Wrapper>
          <Cursor onClick={this.onNavigatorClick}>
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
              onHoverVariants={this.onHoverVariantsInTrack}
            />
          </Cursor>
          <PositionAxisTrack />
        </Wrapper>
        <TrackPageSection style={{ fontSize: '14px' }}>
          <Wrapper>
            <MitochondrialVariantFilterControls value={filter} onChange={this.onFilter} />
            <div>
              <ExportMitochondrialVariantsButton
                exportFileName={exportFileName}
                includeGene={context.gene_id === undefined && context.transcript_id === undefined}
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
                ref={this.table}
                columns={renderedTableColumns}
                highlightText={filter.searchText}
                numRowsRendered={numRowsRendered}
                shouldHighlightRow={this.shouldHighlightTableRow}
                sortKey={sortKey}
                sortOrder={sortOrder}
                variants={renderedVariants}
                onHoverVariant={this.onHoverVariantInTable}
                onRequestSort={this.onSort}
                onVisibleRowsChange={this.onVisibleRowsChange}
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
              this.setState({ showTableConfigurationModal: false })
            }}
            onSave={newSelectedColumns => {
              const columnsForContext = getColumnsForContext(context)
              this.setState({
                renderedTableColumns: ['variant_id', ...newSelectedColumns]
                  .map(columnKey => columnsForContext[columnKey])
                  .filter(Boolean)
                  .map(column => ({
                    ...column,
                    isSortable: Boolean(column.compareFunction),
                    tooltip: column.description,
                  })),
                selectedColumns: newSelectedColumns,
                showTableConfigurationModal: false,
              })

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
}

export default MitochondrialVariants
