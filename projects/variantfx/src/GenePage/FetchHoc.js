/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'
import { currentGene, geneData, isFetching, actions as geneActions } from '@broad/redux-genes'
import { currentDisease, currentGeneDiseaseData } from '../redux'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchGeneIfNeeded: PropTypes.func.isRequired,
    resetSearchVariants: PropTypes.func.isRequired,
    currentDisease: PropTypes.string.isRequired,
    currentGeneDiseaseData: PropTypes.any.isRequired,
    match: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired
  }

  static defaultProps = {
    gene: null,
  }

  componentDidMount() {
    const { currentGene, match, fetchGeneIfNeeded } = this.props
    fetchGeneIfNeeded(currentGene, match, history)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchGeneIfNeeded, currentDisease, currentGene, history } = this.props  // eslint-disable-line
    if (currentGene !== nextProps.currentGene) {
      // if(this.props.route.path == nextProps.route.path) return false
      history.push(`/gene/${nextProps.currentGene}`)
      fetchGeneIfNeeded(nextProps.currentGene)
      this.props.resetSearchVariants()
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = state => ({
  isFetching: isFetching(state),
  gene: geneData(state),
  currentGene: currentGene(state),
  currentDisease: currentDisease(state),
  currentGeneDiseaseData: currentGeneDiseaseData(state),
})

const mapDispatchToProps = geneFetchFunction => (dispatch) => {
  return {
    fetchGeneIfNeeded: (currentGene, match) => dispatch(
      geneActions.fetchGeneIfNeeded(currentGene, match, geneFetchFunction)
    ),
    resetSearchVariants: () => dispatch(
      variantActions.searchVariants('')
    ),
  }
}

const GenePageHOC = (
  ComposedComponent,
  geneFetchFunction
) => connect(
  mapStateToProps,
  mapDispatchToProps(geneFetchFunction)
)(GenePageContainer(ComposedComponent))

export default GenePageHOC
