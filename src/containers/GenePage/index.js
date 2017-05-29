/* eslint-disable react/no-unused-prop-types */
import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import * as actions from '../../actions'
import {
  getGene,
  getVisibleVariants,
  getAllVariantsAsArray,
  getVariantsInGeneForDataset,
} from '../../reducers'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    setCurrentGene: PropTypes.func.isRequired,
    fetchVariantsIfNeeded: PropTypes.func.isRequired,
    setExonPadding: PropTypes.func.isRequired,
    exonPadding: PropTypes.number.isRequired,
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, fetchVariantsIfNeeded } = this.props
    fetchVariantsIfNeeded(currentGene)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchVariantsIfNeeded } = this.props
    if (this.props.currentGene !== nextProps.currentGene) {
      fetchVariantsIfNeeded(nextProps.currentGene)
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = (state) => {
  const {
    selections: { currentGene, exonPadding },
    genes: { isFetching },

  } = state
  const gene = getGene(state, currentGene)
  let minimal_gnomad_variants
  if (gene) {
    minimal_gnomad_variants = gene.minimal_gnomad_variants

  }
  return {
    currentGene,
    isFetching,
    gene,
    minimal_gnomad_variants,
    exonPadding,
    visibleVariants: getVisibleVariants(state),
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchVariantsIfNeeded: currentGene => dispatch(actions.fetchVariantsIfNeeded(currentGene)),
    setCurrentGene: geneName => dispatch(actions.setCurrentGene(geneName)),
    setExonPadding: padding => dispatch(actions.setExonPadding(padding)),
  }
}

const GenePageHOC = ComposedComponent =>
  connect(mapStateToProps, mapDispatchToProps)(GenePageContainer(ComposedComponent))

export default GenePageHOC
