/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import { currentGene, exonPadding, actions as activeActions } from '../../resources/active'
import { geneData, isFetching, actions as geneActions } from '../../resources/genes'
import { visibleVariants } from '../../resources/table'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    setCurrentGene: PropTypes.func.isRequired,
    fetchGeneIfNeeded: PropTypes.func.isRequired,
    visibleVariants: PropTypes.array.isRequired,
    setExonPadding: PropTypes.func.isRequired,
    exonPadding: PropTypes.number.isRequired,
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, fetchGeneIfNeeded } = this.props
    fetchGeneIfNeeded(currentGene)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchGeneIfNeeded } = this.props
    if (this.props.currentGene !== nextProps.currentGene) {
      fetchGeneIfNeeded(nextProps.currentGene)
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}


const mapStateToProps = state => ({
  currentGene: currentGene(state),
  isFetching: isFetching(state),
  gene: geneData(state),
  exonPadding: exonPadding(state),
  visibleVariants: visibleVariants(state),
})

const mapDispatchToProps = (dispatch) => {
  return {
    fetchGeneIfNeeded: currentGene => dispatch(geneActions.fetchGeneIfNeeded(currentGene)),
    setCurrentGene: geneName => dispatch(activeActions.setCurrentGene(geneName)),
    setExonPadding: padding => dispatch(activeActions.setExonPadding(padding)),
  }
}

const GenePageHOC = ComposedComponent =>
  connect(mapStateToProps, mapDispatchToProps)(GenePageContainer(ComposedComponent))

export default GenePageHOC
