import throttle from 'lodash.throttle'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import {
  actions as variantActions,
  types as variantActionTypes,
  finalFilteredVariants,
  variantSearchQuery,
  variantSortKey,
  variantSortAscending,
} from '@broad/redux-variants'
import { NavigatorTrack } from '@broad/track-navigator'
import { VariantAlleleFrequencyTrack } from '@broad/track-variant'

import { TrackPageSection } from '../TrackPage'
import VariantDetails from '../VariantDetails/VariantDetails'
import GeneSettings from './GeneSettings'
import VariantTable from './VariantTable'

class VariantsInGene extends Component {
  static propTypes = {
    gene: PropTypes.shape({
      gene_id: PropTypes.string.isRequired,
    }).isRequired,
    highlightText: PropTypes.string.isRequired,
    onChangeAnalysisGroup: PropTypes.func.isRequired,
    selectedAnalysisGroup: PropTypes.string.isRequired,
    setVariantSortKey: PropTypes.func.isRequired,
    sortKey: PropTypes.string.isRequired,
    sortOrder: PropTypes.oneOf(['ascending', 'descending']).isRequired,
    sortVariantsByPosition: PropTypes.func.isRequired,
    variants: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  }

  constructor(props) {
    super(props)

    this.state = {
      hoveredVariant: null,
      rowIndexLastClickedInNavigator: 0,
      selectedVariant: null,
      visibleVariantWindow: [0, 19],
    }
  }

  onClickVariant = variant => {
    this.setState({ selectedVariant: variant })
  }

  onHoverVariant = variantId => {
    this.setState({ hoveredVariant: variantId })
  }

  onVisibleRowsChange = throttle(({ startIndex, stopIndex }) => {
    this.setState({ visibleVariantWindow: [startIndex, stopIndex] })
  }, 100)

  onNavigatorClick = position => {
    const { sortVariantsByPosition } = this.props
    sortVariantsByPosition().then(sortedVariants => {
      let index
      if (sortedVariants.length === 0 || position < sortedVariants[0].pos) {
        index = 0
      } else {
        index = sortedVariants.findIndex(
          (variant, i) =>
            sortedVariants[i + 1] &&
            position >= variant.pos &&
            position <= sortedVariants[i + 1].pos
        )
        if (index === -1) {
          index = sortedVariants.length - 1
        }
      }

      this.setState({
        rowIndexLastClickedInNavigator: index,
      })
    })
  }

  render() {
    const {
      gene,
      highlightText,
      onChangeAnalysisGroup,
      selectedAnalysisGroup,
      setVariantSortKey,
      sortKey,
      sortOrder,
      variants: reduxVariants,
    } = this.props
    const {
      hoveredVariant,
      rowIndexLastClickedInNavigator,
      selectedVariant,
      visibleVariantWindow,
    } = this.state

    const variants = reduxVariants.toJS()

    const cases = variants.filter(v => v.ac_case > 0).map(v => ({ ...v, allele_freq: v.af_case }))
    const controls = variants
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
          variants={variants}
          visibleVariantWindow={visibleVariantWindow}
        />
        <TrackPageSection style={{ fontSize: '14px', marginTop: '1em' }}>
          <GeneSettings
            geneId={gene.gene_id}
            selectedAnalysisGroup={selectedAnalysisGroup}
            onChangeAnalysisGroup={onChangeAnalysisGroup}
          />
          <VariantTable
            highlightText={highlightText}
            onClickVariant={this.onClickVariant}
            onHoverVariant={this.onHoverVariant}
            onRequestSort={setVariantSortKey}
            onVisibleRowsChange={this.onVisibleRowsChange}
            rowIndexLastClickedInNavigator={rowIndexLastClickedInNavigator}
            sortKey={sortKey}
            sortOrder={sortOrder}
            variants={variants}
          />
        </TrackPageSection>
        {selectedVariant && (
          <VariantDetails
            variant={selectedVariant}
            onRequestClose={() => {
              this.setState({ selectedVariant: null })
            }}
          />
        )}
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  highlightText: variantSearchQuery(state),
  sortKey: variantSortKey(state),
  sortOrder: variantSortAscending(state) ? 'ascending' : 'descending',
  variants: finalFilteredVariants(state),
})

const mapDispatchToProps = dispatch => ({
  sortVariantsByPosition: () => {
    return new Promise(resolve => {
      dispatch({ type: variantActionTypes.ORDER_VARIANTS_BY_POSITION })
      dispatch((_, getState) => {
        const variants = finalFilteredVariants(getState())
        resolve(variants.toJS())
      })
    })
  },
  setFocusedVariant: variantId => dispatch(variantActions.setFocusedVariant(variantId)),
  setVariantSortKey: sortKey => dispatch(variantActions.setVariantSort(sortKey)),
})

const ConnectedVariantsInGene = connect(
  mapStateToProps,
  mapDispatchToProps
)(VariantsInGene)

export default ConnectedVariantsInGene
