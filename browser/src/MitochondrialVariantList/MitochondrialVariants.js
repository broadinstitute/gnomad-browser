import throttle from 'lodash.throttle'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { PositionAxisTrack } from '@gnomad/region-viewer'

import Cursor from '../RegionViewerCursor'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import VariantTrack from '../VariantList/VariantTrack'

import ExportMitochondrialVariantsButton from './ExportMitochondrialVariantsButton'
import filterMitochondrialVariants from './filterMitochondrialVariants'
import sortMitochondrialVariants from './sortMitochondrialVariants'
import MitochondrialVariantFilterControls from './MitochondrialVariantFilterControls'
import StructrualVariantPropType from './MitochondrialVariantPropType'
import MitochondrialVariantsTable from './MitochondrialVariantsTable'

const NUM_ROWS_RENDERED = 20

const Wrapper = styled.div`
  margin-bottom: 1em;
`

class MitochondrialVariants extends Component {
  static propTypes = {
    context: PropTypes.oneOf(['gene', 'region', 'transcript']).isRequired,
    exportFileName: PropTypes.string.isRequired,
    variants: PropTypes.arrayOf(StructrualVariantPropType).isRequired,
    width: PropTypes.number.isRequired,
  }

  constructor(props) {
    super(props)

    this.tracks = React.createRef()

    this.table = React.createRef()

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

    const defaultSortKey = 'pos'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortMitochondrialVariants(
      filterMitochondrialVariants(props.variants, defaultFilter),
      {
        sortKey: defaultSortKey,
        sortOrder: defaultSortOrder,
      }
    )

    this.state = {
      filter: defaultFilter,
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
      const renderedVariants = sortMitochondrialVariants(
        filterMitochondrialVariants(variants, newFilter),
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
    const { context, exportFileName, variants, width } = this.props
    const {
      filter,
      renderedVariants,
      sortKey,
      sortOrder,
      variantHoveredInTable,
      visibleVariantWindow,
    } = this.state

    if (variants.length === 0) {
      return <StatusMessage>No variants found</StatusMessage>
    }

    const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

    return (
      <div>
        <Wrapper>
          <VariantTrack
            title={`gnomAD\n(${renderedVariants.length})`}
            variants={renderedVariants.map(variant => ({
              ...variant,
              allele_freq: variant.af,
            }))}
          />

          <Cursor onClick={this.onNavigatorClick}>
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
                context={context}
                highlightText={filter.searchText}
                numRowsRendered={numRowsRendered}
                shouldHighlightRow={this.shouldHighlightTableRow}
                sortKey={sortKey}
                sortOrder={sortOrder}
                variants={renderedVariants}
                width={width}
                onHoverVariant={this.onHoverVariantInTable}
                onRequestSort={this.onSort}
                onVisibleRowsChange={this.onVisibleRowsChange}
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

export default MitochondrialVariants
