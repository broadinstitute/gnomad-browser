import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { SegmentedControl } from '@gnomad/ui'

import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'

import ExportStructuralVariantsButton from './ExportStructuralVariantsButton'
import filterVariants from './filterVariants'
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

const HUMAN_CHROMOSOMES = [...Array.from(new Array(22), (x, i) => `${i + 1}`), 'X', 'Y']

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

const sortVariants = (variants, { sortKey, sortOrder }) => {
  const sortColumn = structuralVariantTableColumns.find(column => column.key === sortKey)
  const baseCompareFunction = sortColumn.compareFunction
  const comparator =
    sortOrder === 'ascending' ? baseCompareFunction : (a, b) => baseCompareFunction(b, a)
  return [...variants].sort(comparator)
}

class StructuralVariants extends Component {
  static propTypes = {
    context: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
    exportFileName: PropTypes.string.isRequired,
    variants: PropTypes.arrayOf(StructrualVariantPropType).isRequired,
  }

  constructor(props) {
    super(props)

    this.tracks = React.createRef()

    this.table = React.createRef()

    const columnsForContext = getColumnsForContext(props.context)
    const renderedTableColumns = ['variant_id', ...DEFAULT_COLUMNS]
      .map(columnKey => columnsForContext[columnKey])
      .filter(Boolean)
      .map(column => ({
        ...column,
        isSortable: Boolean(column.compareFunction),
        tooltip: column.description,
      }))

    const defaultFilter = {
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
    }

    const defaultSortKey = 'pos'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortVariants(filterVariants(props.variants, defaultFilter), {
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
    })

    this.state = {
      filter: defaultFilter,
      highlightedVariantTrack: null,
      renderedTableColumns,
      renderedVariants,
      shouldHighlightTableRow: () => false,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      colorKey: 'consequence',
    }
  }

  onFilter = newFilter => {
    this.setState(state => {
      const { variants } = this.props
      const { sortKey, sortOrder } = state
      const renderedVariants = sortVariants(filterVariants(variants, newFilter), {
        sortKey,
        sortOrder,
      })
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
    this.setState({ highlightedVariantTrack: variantId })
  }

  onHoverVariantInTracks = variantId => {
    this.setState({
      highlightedVariantTrack: variantId,
      shouldHighlightTableRow: variantId
        ? variant => variant.variant_id === variantId
        : () => false,
    })
  }

  onScrollTable = ({ scrollOffset, scrollUpdateWasRequested }) => {
    if (this.tracks.current && !scrollUpdateWasRequested) {
      this.tracks.current.scrollTo(Math.round(scrollOffset * (TRACK_HEIGHT / TABLE_ROW_HEIGHT)))
    }
  }

  onScrollTracks = ({ scrollOffset, scrollUpdateWasRequested }) => {
    if (this.table.current && !scrollUpdateWasRequested) {
      this.table.current.scrollTo(Math.round(scrollOffset * (TABLE_ROW_HEIGHT / TRACK_HEIGHT)))
    }
  }

  trackColor = variant => {
    const { colorKey } = this.state
    if (colorKey === 'type') {
      return svTypeColors[variant.type] || svTypeColors.OTH
    }
    return variant.consequence
      ? svConsequenceCategoryColors[svConsequenceCategories[variant.consequence]]
      : svConsequenceCategoryColors.other
  }

  render() {
    const { context, exportFileName, variants } = this.props
    const {
      filter,
      highlightedVariantTrack,
      renderedTableColumns,
      renderedVariants,
      shouldHighlightTableRow,
      sortKey,
      sortOrder,
      colorKey,
    } = this.state

    if (variants.length === 0) {
      return <StatusMessage>No variants found</StatusMessage>
    }

    const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

    // pos/end and pos2/end2 coordinates are based on the chromosome which they are located on.
    // If that chromosome is not the same as the one that the region viewer's coordinates
    // are based on, then offset the positions so that they are based on the
    // region viewer's coordinate system.
    const currentChromIndex = HUMAN_CHROMOSOMES.indexOf(context.chrom)
    const positionCorrectedVariants = renderedVariants.map(variant => {
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
            onChange={value => {
              this.setState({ colorKey: value })
            }}
          />
        </ControlWrapper>
        <Wrapper>
          <StructuralVariantTracks
            ref={this.tracks}
            highlightedVariant={highlightedVariantTrack}
            numTracksRendered={numRowsRendered}
            onHover={this.onHoverVariantInTracks}
            onScroll={this.onScrollTracks}
            trackColor={this.trackColor}
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
              colorKey={colorKey}
              value={filter}
              onChange={this.onFilter}
            />
            <div>
              <ExportStructuralVariantsButton
                exportFileName={exportFileName}
                variants={renderedVariants}
              />
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
                ref={this.table}
                cellData={{
                  colorKey,
                  highlightWords: filter.searchText.split(',').map(s => s.trim()),
                }}
                columns={renderedTableColumns}
                numRowsRendered={numRowsRendered}
                onHoverVariant={this.onHoverVariantInTable}
                onRequestSort={this.onSort}
                onScroll={this.onScrollTable}
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
      </div>
    )
  }
}

export default StructuralVariants
