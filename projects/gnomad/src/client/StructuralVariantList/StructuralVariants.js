import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'

import { PositionAxisTrack } from '@broad/track-navigator'
import { SegmentedControl } from '@broad/ui'
import { HUMAN_CHROMOSOMES } from '@broad/utilities'

import { TrackPageSection } from '../TrackPage'
import filterVariants from './filterVariants'
import sortVariants from './sortVariants'
import {
  svConsequenceCategories,
  svConsequenceCategoryColors,
} from './structuralVariantConsequences'
import { svTypeColors } from './structuralVariantTypes'
import StructuralVariantFilterControls from './StructuralVariantFilterControls'
import StructrualVariantPropType from './StructuralVariantPropType'
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

class StructuralVariants extends Component {
  static propTypes = {
    chrom: PropTypes.string.isRequired,
    variants: PropTypes.arrayOf(StructrualVariantPropType).isRequired,
    width: PropTypes.number.isRequired,
  }

  tracks = React.createRef()

  table = React.createRef()

  constructor(props) {
    super(props)

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
    const { chrom, width } = this.props
    const {
      filter,
      highlightedVariantTrack,
      renderedVariants,
      shouldHighlightTableRow,
      sortKey,
      sortOrder,
      colorKey,
    } = this.state

    const numRowsRendered = Math.min(renderedVariants.length, NUM_ROWS_RENDERED)

    // pos and end_pos coordinates are based on the chromosome which they are located on.
    // If that chromosome is not the same as the one that the region viewer's coordinates
    // are based on, then offset the start/end position so that it is based on the
    // region viewer's coordinate system.
    const currentChromIndex = HUMAN_CHROMOSOMES.indexOf(chrom)
    const positionCorrectedVariants = renderedVariants.map(variant => {
      const copy = { ...variant }

      // If chrom === end_chrom, then both points are on the same chromosome
      // as the current gene/region
      if (variant.chrom !== variant.end_chrom) {
        const chromIndex = HUMAN_CHROMOSOMES.indexOf(variant.chrom)
        const endChromIndex = HUMAN_CHROMOSOMES.indexOf(variant.end_chrom)
        copy.pos += (chromIndex - currentChromIndex) * 1e9
        copy.end_pos += (endChromIndex - currentChromIndex) * 1e9
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
          </Wrapper>
          <Wrapper>
            <StructuralVariantsTable
              ref={this.table}
              cellData={{ colorKey, highlightWords: filter.searchText.split(/\s+/) }}
              numRowsRendered={numRowsRendered}
              onHoverVariant={this.onHoverVariantInTable}
              onRequestSort={this.onSort}
              onScroll={this.onScrollTable}
              rowHeight={TABLE_ROW_HEIGHT}
              shouldHighlightRow={shouldHighlightTableRow}
              sortKey={sortKey}
              sortOrder={sortOrder}
              variants={renderedVariants}
              width={width}
            />
          </Wrapper>
        </TrackPageSection>
      </div>
    )
  }
}

export default StructuralVariants
