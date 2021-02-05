import throttle from 'lodash.throttle'
import PropTypes from 'prop-types'
import React, { Component, createRef } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'

import ClinvarVariantTrack from '../clinvar/ClinvarVariantTrack'
import formatClinvarDate from '../clinvar/formatClinvarDate'
import { labelForDataset } from '../datasets'
import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import ExportVariantsButton from './ExportVariantsButton'
import filterVariants from './filterVariants'
import mergeExomeAndGenomeData from './mergeExomeAndGenomeData'
import sortVariants from './sortVariants'
import VariantFilterControls from './VariantFilterControls'
import VariantTable from './VariantTable'
import { getColumnsForContext } from './variantTableColumns'
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

class Variants extends Component {
  static propTypes = {
    children: PropTypes.node,
    clinvarReleaseDate: PropTypes.string.isRequired,
    clinvarVariants: PropTypes.arrayOf(PropTypes.object),
    context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    datasetId: PropTypes.string.isRequired,
    exportFileName: PropTypes.string,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  static defaultProps = {
    children: undefined,
    clinvarVariants: null,
    exportFileName: 'variants',
  }

  constructor(props) {
    super(props)

    this.table = createRef()

    const columnsForContext = getColumnsForContext(props.context)
    if (columnsForContext.clinical_significance) {
      columnsForContext.clinical_significance.description = `ClinVar clinical significance, based on ClinVar's ${formatClinvarDate(
        props.clinvarReleaseDate
      )} release`
    }

    const renderedTableColumns = ['variant_id', ...DEFAULT_COLUMNS]
      .map(columnKey => columnsForContext[columnKey])
      .filter(Boolean)
      .map(column => ({ ...column, tooltip: column.description }))

    const defaultFilter = {
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
    }

    const defaultSortKey = 'variant_id'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortVariants(
      mergeExomeAndGenomeData(filterVariants(props.variants, defaultFilter)),
      {
        sortKey: defaultSortKey,
        sortOrder: defaultSortOrder,
      }
    )

    this.state = {
      filter: defaultFilter,
      renderedTableColumns,
      renderedVariants,
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
      const { sortKey, sortOrder } = state
      const renderedVariants = sortVariants(
        mergeExomeAndGenomeData(filterVariants(variants, newFilter)),
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
      const sortedVariants = sortVariants(renderedVariants, {
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
    const sortedVariants = sortVariants(renderedVariants, {
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
        this.table.current.scrollToDataRow(index)
      }
    )
  }

  render() {
    const {
      children,
      clinvarReleaseDate,
      clinvarVariants,
      datasetId,
      exportFileName,
      variants,
    } = this.props
    const {
      filter,
      renderedTableColumns,
      renderedVariants,
      sortKey,
      sortOrder,
      variantHoveredInTable,
      variantHoveredInTrack,
      visibleVariantWindow,
    } = this.state

    const datasetLabel = labelForDataset(datasetId)

    if (variants.length === 0) {
      return <StatusMessage>No variants found</StatusMessage>
    }

    return (
      <div>
        {clinvarVariants && (
          <>
            <h2 style={{ marginLeft: '115px' }}>ClinVar variants</h2>
            <ClinvarVariantTrack variants={clinvarVariants} />
            <p style={{ marginLeft: '115px' }}>
              Data displayed here is from ClinVar&apos;s {formatClinvarDate(clinvarReleaseDate)}{' '}
              release.
            </p>
          </>
        )}

        <h2 style={{ margin: '2em 0 0.25em 115px' }}>gnomAD variants</h2>
        <Cursor onClick={this.onNavigatorClick}>
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
            onHoverVariants={this.onHoverVariantsInTrack}
          />
        </Cursor>

        <PositionAxisTrack />

        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <VariantFilterControls onChange={this.onFilter} value={filter} />
          <div>
            <ExportVariantsButton
              datasetId={datasetId}
              exportFileName={exportFileName}
              variants={renderedVariants}
            />
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
                ref={this.table}
                columns={renderedTableColumns}
                highlightText={filter.searchText}
                highlightedVariantId={variantHoveredInTrack}
                onHoverVariant={this.onHoverVariantInTable}
                onRequestSort={this.onSort}
                onVisibleRowsChange={this.onVisibleRowsChange}
                sortKey={sortKey}
                sortOrder={sortOrder}
                variants={renderedVariants}
              />
            ) : (
              <StatusMessage>No matching variants</StatusMessage>
            )}
          </div>
        </TrackPageSection>
      </div>
    )
  }
}

export default Variants
