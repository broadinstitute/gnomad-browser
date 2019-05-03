import throttle from 'lodash.throttle'
import memoizeOne from 'memoize-one'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { NavigatorTrack } from '@broad/track-navigator'

import datasetLabels from '../datasetLabels'
import { Query } from '../Query'
import StatusMessage from '../StatusMessage'
import { TrackPageSection } from '../TrackPage'
import ExportVariantsButton from '../VariantList/ExportVariantsButton'
import filterVariants from '../VariantList/filterVariants'
import mergeExomeAndGenomeData from '../VariantList/mergeExomeAndGenomeData'
import sortVariants from '../VariantList/sortVariants'
import VariantFilterControls from '../VariantList/VariantFilterControls'
import VariantTable from '../VariantList/VariantTable'
import { getColumns } from '../VariantList/variantTableColumns'
import VariantTrack from '../VariantList/VariantTrack'

class VariantsInRegion extends Component {
  static propTypes = {
    datasetId: PropTypes.string.isRequired,
    region: PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    }).isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired,
    width: PropTypes.number.isRequired,
  }

  constructor(props) {
    super(props)

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
      hoveredVariant: null,
      renderedVariants,
      rowIndexLastClickedInNavigator: 0,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      visibleVariantWindow: [0, 19],
    }
  }

  getColumns = memoizeOne((width, chrom, datasetId) =>
    getColumns({
      datasetId,
      width,
      includeHomozygoteAC: chrom !== 'Y',
      includeHemizygoteAC: chrom === 'X' || chrom === 'Y',
    })
  )

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

  onHoverVariant = variantId => {
    this.setState({ hoveredVariant: variantId })
  }

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

    this.setState({
      renderedVariants: sortedVariants,
      rowIndexLastClickedInNavigator: index,
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })
  }

  render() {
    const { datasetId, region, width } = this.props
    const {
      filter,
      hoveredVariant,
      renderedVariants,
      rowIndexLastClickedInNavigator,
      sortKey,
      sortOrder,
      visibleVariantWindow,
    } = this.state

    const datasetLabel = datasetLabels[datasetId]

    return (
      <div>
        <VariantTrack
          title={`${datasetLabel}\n(${renderedVariants.length})`}
          variants={renderedVariants}
        />
        <NavigatorTrack
          hoveredVariant={hoveredVariant}
          onNavigatorClick={this.onNavigatorClick}
          title="Viewing in table"
          variants={renderedVariants}
          visibleVariantWindow={visibleVariantWindow}
        />
        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <VariantFilterControls onChange={this.onFilter} value={filter} />
          <div>
            <ExportVariantsButton
              datasetId={datasetId}
              exportFileName={`${datasetLabel}_${region.chrom}-${region.start}-${region.stop}`}
              variants={renderedVariants}
            />
          </div>
          <VariantTable
            columns={this.getColumns(width, region.chrom, datasetId)}
            highlightText={filter.searchText}
            onHoverVariant={this.onHoverVariant}
            onRequestSort={this.onSort}
            onVisibleRowsChange={this.onVisibleRowsChange}
            rowIndexLastClickedInNavigator={rowIndexLastClickedInNavigator}
            sortKey={sortKey}
            sortOrder={sortOrder}
            variants={renderedVariants}
          />
        </TrackPageSection>
      </div>
    )
  }
}

const ConnectedVariantsInRegion = ({ datasetId, region, width }) => {
  const { chrom, start, stop } = region

  const query = `{
    region(start: ${start}, stop: ${stop}, chrom: "${chrom}") {
      variants(dataset: ${datasetId}) {
        consequence
        flags
        hgvs
        hgvsc
        hgvsp
        pos
        rsid
        variant_id: variantId
        xpos
        exome {
          ac
          ac_hemi
          ac_hom
          an
          af
          filters
          populations {
            id
            ac
            an
            ac_hemi
            ac_hom
          }
        }
        genome {
          ac
          ac_hemi
          ac_hom
          an
          af
          filters
          populations {
            id
            ac
            an
            ac_hemi
            ac_hom
          }
        }
      }
    }
  }`

  return (
    <Query query={query}>
      {({ data, error, graphQLErrors, loading }) => {
        if (loading) {
          return <StatusMessage>Loading variants...</StatusMessage>
        }

        if (error || !((data || {}).region || {}).variants) {
          return <StatusMessage>Failed to load variants</StatusMessage>
        }

        const tooManyVariantsError = /Individual variants can only be returned for regions with fewer than \d+ variants/
        const tooManyVariants =
          graphQLErrors && graphQLErrors.some(err => tooManyVariantsError.test(err.message))

        if (tooManyVariants) {
          return (
            <TrackPageSection>
              <StatusMessage>
                This region has too many variants to display.
                <br />
                To view individual variants, select a smaller region.
              </StatusMessage>
            </TrackPageSection>
          )
        }

        return (
          <VariantsInRegion
            datasetId={datasetId}
            region={region}
            variants={data.region.variants}
            width={width}
          />
        )
      }}
    </Query>
  )
}

ConnectedVariantsInRegion.propTypes = {
  datasetId: PropTypes.string.isRequired,
  region: PropTypes.shape({
    chrom: PropTypes.string.isRequired,
    start: PropTypes.number.isRequired,
    stop: PropTypes.number.isRequired,
  }).isRequired,
  width: PropTypes.number.isRequired,
}

export default ConnectedVariantsInRegion
