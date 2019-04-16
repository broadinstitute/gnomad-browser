import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'

import StatusMessage from '../StatusMessage'

import fetchGeneData from './fetchGeneData'
import fetchVariants from './fetchVariants'

const GeneDataContainer = connect(
  null,
  (dispatch, ownProps) => ({
    loadVariants() {
      return dispatch(thunkDispatch => {
        thunkDispatch(variantActions.setSelectedVariantDataset(ownProps.datasetId))
        thunkDispatch(variantActions.requestVariants())
        return fetchVariants(ownProps.geneName, ownProps.analysisGroup).then(response => {
          const variantData = response.data.gene
          thunkDispatch(variantActions.receiveVariants(variantData))

          // Reset variant filters when loading a new gene
          thunkDispatch(variantActions.searchVariants(''))
          thunkDispatch(
            variantActions.setVariantFilter({
              lof: true,
              missense: true,
              synonymous: true,
              other: true,
            })
          )

          return response
        })
      })
    },
  })
)(
  class GeneDataContainerInner extends Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      analysisGroup: PropTypes.string.isRequired,
      geneName: PropTypes.string.isRequired,
      loadVariants: PropTypes.func.isRequired,
    }

    state = {
      geneData: null,
      isLoadingGene: false,
      isLoadingVariants: false,
      loadError: null,
    }

    componentDidMount() {
      this.mounted = true
      this.loadGene()
      this.loadVariants()
    }

    componentDidUpdate(prevProps) {
      const { analysisGroup, geneName } = this.props
      if (geneName !== prevProps.geneName) {
        this.loadGene()
        this.loadVariants()
      } else if (analysisGroup !== prevProps.analysisGroup) {
        this.loadVariants()
      }
    }

    componentWillUnmount() {
      this.mounted = false
    }

    loadGene() {
      const { geneName } = this.props

      this.setState({
        isLoadingGene: true,
        loadError: null,
      })

      fetchGeneData(geneName)
        .then(response => {
          const geneData = response.data.gene
          let loadError = null
          if (!geneData) {
            loadError = 'Gene not found'
          }
          if (!this.mounted) {
            return
          }
          this.setState({
            geneData,
            isLoadingGene: false,
            loadError,
          })
        })
        .catch(() => {
          if (!this.mounted) {
            return
          }
          this.setState({
            geneData: null,
            isLoadingGene: false,
            loadError: 'Unable to load gene',
          })
        })
    }

    loadVariants() {
      this.setState({ isLoadingVariants: true })

      // eslint-disable-next-line react/destructuring-assignment
      this.props
        .loadVariants()
        .then(() => {
          if (!this.mounted) {
            return
          }
          this.setState({ isLoadingVariants: false })
        })
        .catch(() => {
          if (!this.mounted) {
            return
          }
          this.setState({ isLoadingVariants: false })
        })
    }

    render() {
      const { children } = this.props
      const { geneData, isLoadingGene, isLoadingVariants, loadError } = this.state

      if (isLoadingGene) {
        return <StatusMessage>Loading gene...</StatusMessage>
      }

      if (loadError) {
        return <StatusMessage>{loadError}</StatusMessage>
      }

      if (geneData) {
        return children({
          gene: geneData,
          isLoadingVariants,
        })
      }

      return null
    }
  }
)

GeneDataContainer.propTypes = {
  children: PropTypes.func.isRequired,
  analysisGroup: PropTypes.string.isRequired,
  geneName: PropTypes.string.isRequired,
}

export default GeneDataContainer
