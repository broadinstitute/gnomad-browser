import throttle from 'lodash.throttle'
import memoizeOne from 'memoize-one'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { PositionAxisTrack } from '@gnomad/region-viewer'
import { Badge } from '@gnomad/ui'

import ClinvarVariantTrack from '../clinvar/ClinvarVariantTrack'
import { labelForDataset, referenceGenomeForDataset } from '../datasets'
import Query from '../Query'
import Cursor from '../RegionViewerCursor'
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
    clinvarVariants: PropTypes.arrayOf(PropTypes.object),
    datasetId: PropTypes.string.isRequired,
    region: PropTypes.shape({
      chrom: PropTypes.string.isRequired,
      start: PropTypes.number.isRequired,
      stop: PropTypes.number.isRequired,
    }).isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired,
    width: PropTypes.number.isRequired,
  }

  static defaultProps = {
    clinvarVariants: null,
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
      renderedVariants,
      rowIndexLastClickedInNavigator: 0,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      variantHoveredInTable: null,
      variantHoveredInTrack: null,
      visibleVariantWindow: [0, 19],
    }
  }

  getColumns = memoizeOne((width, chrom) => {
    const { variants } = this.props
    return getColumns({
      context: 'region',
      width,
      includeLofCuration: variants.some(variant => variant.lof_curation),
      includeHomozygoteAC: chrom !== 'Y',
      includeHemizygoteAC: chrom === 'X' || chrom === 'Y',
    })
  })

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

    this.setState({
      renderedVariants: sortedVariants,
      rowIndexLastClickedInNavigator: index,
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })
  }

  render() {
    const { clinvarVariants, datasetId, region, width } = this.props
    const {
      filter,
      renderedVariants,
      rowIndexLastClickedInNavigator,
      sortKey,
      sortOrder,
      variantHoveredInTable,
      variantHoveredInTrack,
      visibleVariantWindow,
    } = this.state

    const datasetLabel = labelForDataset(datasetId)

    return (
      <div>
        {clinvarVariants && (
          <ClinvarVariantTrack
            selectedGnomadVariants={renderedVariants}
            variants={clinvarVariants}
            variantFilter={filter}
          />
        )}

        <VariantTrack
          title={`${datasetLabel}\n(${renderedVariants.length})`}
          variants={renderedVariants}
        />

        <Cursor onClick={this.onNavigatorClick}>
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
              exportFileName={`${datasetLabel}_${region.chrom}-${region.start}-${region.stop}`}
              variants={renderedVariants}
            />
          </div>
          {datasetId.startsWith('gnomad_r3') && (
            <p>
              <Badge level="error">Warning</Badge> We have identified an issue in gnomAD v3.1 where
              some variants are missing VEP annotations. As a result, some variants in the table
              below may be missing consequences. We are working on a resolution for this issue.
            </p>
          )}
          <VariantTable
            columns={this.getColumns(width, region.chrom)}
            highlightText={filter.searchText}
            highlightedVariantId={variantHoveredInTrack}
            onHoverVariant={this.onHoverVariantInTable}
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

const query = `
query VariantInRegion($chrom: String!, $start: Int!, $stop: Int!, $datasetId: DatasetId!, $referenceGenome: ReferenceGenomeId!) {
  region(start: $start, stop: $stop, chrom: $chrom, reference_genome: $referenceGenome) {
    clinvar_variants {
      clinical_significance
      clinvar_variation_id
      gold_stars
      major_consequence
      pos
      variant_id
    }
    variants(dataset: $datasetId) {
      consequence
      flags
      gene_id
      gene_symbol
      hgvs
      hgvsc
      hgvsp
      lof
      lof_filter
      lof_flags
      pos
      rsid
      variant_id: variantId
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
      lof_curation {
        verdict
        flags
      }
    }
  }
}`

const ConnectedVariantsInRegion = ({ datasetId, region, width }) => (
  <Query
    query={query}
    variables={{
      datasetId,
      chrom: region.chrom,
      start: region.start,
      stop: region.stop,
      referenceGenome: referenceGenomeForDataset(datasetId),
    }}
    loadingMessage="Loading variants"
    errorMessage="Unable to load variants"
    success={data => data.region && data.region.variants}
  >
    {({ data }) => {
      return (
        <VariantsInRegion
          clinvarVariants={data.region.clinvar_variants}
          datasetId={datasetId}
          region={region}
          variants={data.region.variants}
          width={width}
        />
      )
    }}
  </Query>
)

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
