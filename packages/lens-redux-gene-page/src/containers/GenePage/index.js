/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import * as actions from '../../actions'

import {
  currentGene,
  exonPadding,
  actions as activeActions,
} from '../../resources/active'

import {
  getGene,
  getVisibleVariants,
} from '../../selectors'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    setCurrentGene: PropTypes.func.isRequired,
    fetchVariantsIfNeeded: PropTypes.func.isRequired,
    visibleVariants: PropTypes.array.isRequired,
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

const mapStateToProps = state => ({
  currentGene: currentGene(state),
  isFetching: state.genes.isFetching,
  gene: getGene(state),
  exonPadding: exonPadding(state),
  visibleVariants: getVisibleVariants(state),
})

const mapDispatchToProps = (dispatch) => {
  return {
    fetchVariantsIfNeeded: currentGene => dispatch(actions.fetchVariantsIfNeeded(currentGene)),
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
    setExonPadding: padding => dispatch(activeActions.setExonPadding(padding)),
  }
}

const GenePageHOC = ComposedComponent =>
  connect(mapStateToProps, mapDispatchToProps)(GenePageContainer(ComposedComponent))

export default GenePageHOC
