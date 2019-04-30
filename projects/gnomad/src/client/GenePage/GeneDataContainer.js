import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as geneActions } from '@broad/redux-genes'

import StatusMessage from '../StatusMessage'

const GeneDataContainer = connect(
  null,
  (dispatch, ownProps) => ({
    loadGene() {
      return dispatch(thunkDispatch => {
        thunkDispatch(geneActions.setCurrentGene(ownProps.geneIdOrName))
        thunkDispatch(geneActions.setCurrentTranscript(ownProps.transcriptId))
        thunkDispatch(geneActions.requestGeneData(ownProps.geneIdOrName))
        return ownProps.fetchGene(ownProps.geneIdOrName).then(response => {
          const geneData = response.data.gene
          thunkDispatch(geneActions.receiveGeneData(ownProps.geneIdOrName, geneData))
          return response
        })
      })
    },
  })
)(
  class GeneData extends Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      geneIdOrName: PropTypes.string.isRequired,
      loadGene: PropTypes.func.isRequired,
      transcriptId: PropTypes.string,
    }

    static defaultProps = {
      transcriptId: undefined,
    }

    state = {
      geneData: null,
      isLoadingGene: false,
      loadError: null,
    }

    componentDidMount() {
      this.mounted = true
      this.loadGene()
    }

    componentDidUpdate(prevProps) {
      const { geneIdOrName } = this.props
      if (geneIdOrName !== prevProps.geneIdOrName) {
        this.loadGene()
      }
    }

    componentWillUnmount() {
      this.mounted = false
    }

    loadGene() {
      const { transcriptId } = this.props

      this.setState(
        {
          isLoadingGene: true,
          loadError: null,
        },
        () => {
          // eslint-disable-next-line react/destructuring-assignment
          this.props
            .loadGene()
            .then(response => {
              const geneData = response.data.gene
              let loadError = null
              if (!geneData) {
                loadError = 'Gene not found'
              }
              if (
                transcriptId &&
                !geneData.transcripts.map(t => t.transcript_id).includes(transcriptId)
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
      )
    }

    render() {
      const { children } = this.props
      const { geneData, isLoadingGene, loadError } = this.state

      if (isLoadingGene) {
        return <StatusMessage>Loading gene...</StatusMessage>
      }

      if (loadError) {
        return <StatusMessage>{loadError}</StatusMessage>
      }

      if (geneData) {
        return children({ gene: geneData })
      }

      return null
    }
  }
)

GeneDataContainer.propTypes = {
  children: PropTypes.func.isRequired,
  fetchGene: PropTypes.func.isRequired,
  geneIdOrName: PropTypes.string.isRequired,
  transcriptId: PropTypes.string,
}

GeneDataContainer.defaultProps = {
  transcriptId: undefined,
}

export default GeneDataContainer
