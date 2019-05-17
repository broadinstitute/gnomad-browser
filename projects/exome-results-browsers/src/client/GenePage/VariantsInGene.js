import throttle from 'lodash.throttle'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { createGlobalStyle } from 'styled-components'

import { NavigatorTrack } from '@broad/track-navigator'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'
import { Modal } from '@broad/ui'

import browserConfig from '@browser/config'

import Query from '../Query'
import StatusMessage from '../StatusMessage'
import VariantDetails from '../VariantDetails/VariantDetails'
import filterVariants from './filterVariants'
import sortVariants from './sortVariants'
import { TrackPageSection } from './TrackPage'
import VariantFilterControls from './VariantFilterControls'
import variantResultColumns from './variantResultColumns'
import VariantTable from './VariantTable'

const ModalStyles = createGlobalStyle`
  #variant-details-modal .modal-content {
    max-width: none !important;
  }
`

class VariantsInGene extends Component {
  static propTypes = {
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
    }).isRequired,
    onChangeAnalysisGroup: PropTypes.func.isRequired,
    selectedAnalysisGroup: PropTypes.string.isRequired,
    variants: PropTypes.arrayOf(PropTypes.object).isRequired,
  }

  constructor(props) {
    super(props)

    const defaultFilter = {
      browserFilters: (browserConfig.variants.filters || []).reduce(
        (acc, f) => ({
          ...acc,
          [f.id]: f.default,
        }),
        {}
      ),
      includeCategories: {
        lof: true,
        missense: true,
        synonymous: true,
        other: true,
      },
      onlyInAnalysis: false,
      searchText: '',
    }

    const defaultSortKey = 'variant_id'
    const defaultSortOrder = 'ascending'

    const renderedVariants = sortVariants(filterVariants(props.variants, defaultFilter), {
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
    })

    this.state = {
      filter: defaultFilter,
      hoveredVariant: null,
      rowIndexLastClickedInNavigator: 0,
      renderedVariants,
      selectedVariant: null,
      sortKey: defaultSortKey,
      sortOrder: defaultSortOrder,
      visibleVariantWindow: [0, 19],
    }
  }

  onChangeFilter = newFilter => {
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

  onClickVariant = variant => {
    this.setState({ selectedVariant: variant })
  }

  onHoverVariant = variantId => {
    this.setState({ hoveredVariant: variantId })
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
    } else {
      index = sortedVariants.findIndex(
        (variant, i) =>
          sortedVariants[i + 1] && position >= variant.pos && position <= sortedVariants[i + 1].pos
      )

      if (index === -1) {
        index = sortedVariants.length - 1
      }
    }

    this.setState({
      renderedVariants: sortedVariants,
      rowIndexLastClickedInNavigator: index,
      sortKey: 'variant_id',
      sortOrder: 'ascending',
    })
  }

  render() {
    const { gene, onChangeAnalysisGroup, selectedAnalysisGroup } = this.props
    const {
      filter,
      hoveredVariant,
      renderedVariants,
      rowIndexLastClickedInNavigator,
      selectedVariant,
      sortKey,
      sortOrder,
      visibleVariantWindow,
    } = this.state

    const cases = renderedVariants
      .filter(v => v.ac_case > 0)
      .map(v => ({ ...v, allele_freq: v.af_case }))
    const controls = renderedVariants
      .filter(v => v.ac_ctrl > 0)
      .map(v => ({ ...v, allele_freq: v.af_ctrl }))

    return (
      <React.Fragment>
        <VariantAlleleFrequencyTrack title={`Cases\n(${cases.length} variants)`} variants={cases} />
        <VariantAlleleFrequencyTrack
          title={`Controls\n(${controls.length} variants)`}
          variants={controls}
        />
        <NavigatorTrack
          hoveredVariant={hoveredVariant}
          onNavigatorClick={this.onNavigatorClick}
          title="Viewing in table"
          variants={renderedVariants.map(v => ({ ...v, allele_freq: v.af }))}
          visibleVariantWindow={visibleVariantWindow}
        />
        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <VariantFilterControls
            filter={filter}
            onChangeFilter={this.onChangeFilter}
            geneId={gene.gene_id}
            renderedVariants={renderedVariants}
            selectedAnalysisGroup={selectedAnalysisGroup}
            onChangeAnalysisGroup={onChangeAnalysisGroup}
          />
          <VariantTable
            highlightText={filter.searchText}
            onClickVariant={this.onClickVariant}
            onHoverVariant={this.onHoverVariant}
            onRequestSort={this.onSort}
            onVisibleRowsChange={this.onVisibleRowsChange}
            rowIndexLastClickedInNavigator={rowIndexLastClickedInNavigator}
            sortKey={sortKey}
            sortOrder={sortOrder}
            variants={renderedVariants}
          />
        </TrackPageSection>
        <ModalStyles />
        {selectedVariant && (
          <Modal
            id="variant-details-modal"
            size="large"
            title={selectedVariant.variant_id}
            onRequestClose={() => {
              this.setState({ selectedVariant: null })
            }}
          >
            <VariantDetails variantId={selectedVariant.variant_id} />
          </Modal>
        )}
      </React.Fragment>
    )
  }
}

const variantsQuery = `
query VariantsInGene($geneId: String!, $analysisGroup: VariantResultGroupId!) {
  gene(gene_id: $geneId) {
    variants(analysis_group: $analysisGroup) {
      variant_id
      pos

      consequence
      hgvsc
      hgvsp

      ac_case
      ac_ctrl
      af_case
      af_ctrl
      an_case
      an_ctrl

      ${variantResultColumns.map(c => c.key).join('\n')}
    }
  }
}
`

const ConnectedVariantsInGene = ({ gene, selectedAnalysisGroup, ...rest }) => (
  <Query
    query={variantsQuery}
    variables={{ geneId: gene.gene_id, analysisGroup: selectedAnalysisGroup }}
  >
    {({ data, error, loading }) => {
      if (loading) {
        return <StatusMessage>Loading variants...</StatusMessage>
      }

      if (error) {
        return <StatusMessage>Failed to load variants</StatusMessage>
      }

      const variants = data.gene.variants.map(v => {
        const ac = v.ac_case + v.ac_ctrl
        const an = v.an_case + v.an_ctrl
        const af = an === 0 ? 0 : ac / an

        return {
          ...v,
          ac,
          an,
          af,
        }
      })

      return (
        <VariantsInGene
          {...rest}
          gene={gene}
          selectedAnalysisGroup={selectedAnalysisGroup}
          variants={variants}
        />
      )
    }}
  </Query>
)

ConnectedVariantsInGene.propTypes = {
  gene: PropTypes.shape({
    gene_id: PropTypes.string.isRequired,
  }).isRequired,
  selectedAnalysisGroup: PropTypes.string.isRequired,
}

export default ConnectedVariantsInGene
