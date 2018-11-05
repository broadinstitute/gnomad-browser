import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as geneActions } from '@broad/redux-genes'
import { actions as variantActions } from '@broad/redux-variants'

import StatusMessage from '../StatusMessage'

const GeneDataContainer = connect(
  null,
  (dispatch, ownProps) => ({
    loadGene() {
      return dispatch(thunkDispatch => {
        thunkDispatch(geneActions.setCurrentGene(ownProps.geneIdOrName))
        thunkDispatch(geneActions.setCurrentTranscript(ownProps.transcriptId))
        thunkDispatch(geneActions.requestGeneData(ownProps.geneIdOrName))
        return ownProps.fetchGene(ownProps.geneIdOrName, ownProps.transcriptId).then(response => {
          const geneData = response.data.gene
          thunkDispatch(geneActions.receiveGeneData(ownProps.geneIdOrName, geneData))
          return response
        })
      })
    },
    loadVariants() {
      return dispatch(thunkDispatch => {
        thunkDispatch(variantActions.setSelectedVariantDataset(ownProps.datasetId))
        thunkDispatch(variantActions.requestVariants())
        return ownProps
          .fetchVariants(ownProps.geneIdOrName, ownProps.transcriptId, ownProps.datasetId)
          .then(response => {
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
  class GeneData extends Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      datasetId: PropTypes.string.isRequired,
      geneIdOrName: PropTypes.string.isRequired,
      loadGene: PropTypes.func.isRequired,
      loadVariants: PropTypes.func.isRequired,
      transcriptId: PropTypes.string,
    }

    static defaultProps = {
      transcriptId: undefined,
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
      if (
        this.props.geneIdOrName !== prevProps.geneIdOrName ||
        this.props.transcriptId !== prevProps.transcriptId
      ) {
        this.loadGene()
        this.loadVariants()
      } else if (this.props.datasetId !== prevProps.datasetId) {
        this.loadVariants()
      }
    }

    componentWillUnmount() {
      this.mounted = false
    }

    loadGene() {
      this.setState({
        isLoadingGene: true,
        loadError: null,
      })

      this.props
        .loadGene()
        .then(response => {
          const geneData = response.data.gene
          let loadError = null
          if (!geneData) {
            loadError = 'Gene not found'
          }
          if (
            this.props.transcriptId &&
            !geneData.transcripts.map(t => t.transcript_id).includes(this.props.transcriptId)
          ) {
            loadError = 'Transcript not found'
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
      if (this.state.isLoadingGene) {
        return <StatusMessage>Loading gene...</StatusMessage>
      }

      if (this.state.loadError) {
        return <StatusMessage>{this.state.loadError}</StatusMessage>
      }

      if (this.state.geneData) {
        return this.props.children({
          gene: this.state.geneData,
          isLoadingVariants: this.state.isLoadingVariants,
        })
      }

      return null
    }
  }
)

GeneDataContainer.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
  fetchGene: PropTypes.func.isRequired,
  fetchVariants: PropTypes.func.isRequired,
  geneIdOrName: PropTypes.string.isRequired,
  transcriptId: PropTypes.string,
}

GeneDataContainer.defaultProps = {
  transcriptId: undefined,
}

export default GeneDataContainer
