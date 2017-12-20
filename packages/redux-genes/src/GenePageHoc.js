/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'
import { actions as tableActions } from '@broad/table'
import { currentGene, isFetching, geneData, geneNotFound, actions as geneActions } from './index'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchGeneIfNeeded: PropTypes.func.isRequired,
    resetSearchVariants: PropTypes.func.isRequired,
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, match, fetchGeneIfNeeded } = this.props
    fetchGeneIfNeeded(currentGene, match, history)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchGeneIfNeeded, currentGene, history } = this.props
    if (currentGene !== nextProps.currentGene) {
      // if(this.props.route.path == nextProps.route.path) return false
      history.push(`/gene/${nextProps.currentGene}`)
      fetchGeneIfNeeded(nextProps.currentGene)
      this.props.resetSearchVariants()
      this.props.resetFilter()
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = state => ({
  isFetching: isFetching(state),
  geneNotFound: geneNotFound(state),
  gene: geneData(state),
  currentGene: currentGene(state),
})

const mapDispatchToProps = (geneFetchFunction, exportFetch) => (dispatch) => {
  return {
    fetchGeneIfNeeded: (currentGene, match) => dispatch(
      geneActions.fetchGeneIfNeeded(currentGene, match, geneFetchFunction)
    ),
    resetSearchVariants: () => dispatch(
      variantActions.searchVariantsRaw('')
    ),
    resetFilter: () => dispatch(
      variantActions.setVariantFilter('all')
    ),
    exportVariantsToCsv: () => dispatch(
      variantActions.exportVariantsToCsv(exportFetch)
    ),
  }
}

const GenePageHOC = (
  ComposedComponent,
  geneFetchFunction,
  exportFetch,
) => connect(
  mapStateToProps,
  mapDispatchToProps(geneFetchFunction, exportFetch)
)(GenePageContainer(ComposedComponent))

export default GenePageHOC
