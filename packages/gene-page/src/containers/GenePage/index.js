/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import { currentGene } from '../../resources/active'
import { geneData, isFetching, actions as geneActions } from '../../resources/genes'

const GenePageContainer = ComposedComponent => class GenePage extends Component {
  static propTypes = {
    currentGene: PropTypes.string.isRequired,
    gene: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchGeneIfNeeded: PropTypes.func.isRequired,
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
  isFetching: isFetching(state),
  gene: geneData(state),
  currentGene: currentGene(state),
})

const mapDispatchToProps = geneFetchFunction => dispatch => {
  return {
    fetchGeneIfNeeded: currentGene => dispatch(geneActions.fetchGeneIfNeeded(currentGene, geneFetchFunction)),
  }
}

const GenePageHOC = (ComposedComponent, geneFetchFunction) =>
  connect(
    mapStateToProps,
    mapDispatchToProps(geneFetchFunction),
  )(GenePageContainer(ComposedComponent))

export default GenePageHOC
