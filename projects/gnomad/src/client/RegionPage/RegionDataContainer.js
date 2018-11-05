import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'
import { actions as regionActions } from '@broad/region'

import StatusMessage from '../StatusMessage'

const RegionDataContainer = connect(
  null,
  (dispatch, ownProps) => ({
    loadRegion() {
      return dispatch(thunkDispatch => {
        thunkDispatch(regionActions.setCurrentRegion(ownProps.regionId))
        thunkDispatch(regionActions.requestRegionData(ownProps.regionId))
        return ownProps.fetchRegion(ownProps.regionId).then(response => {
          const regionData = response.data.region
          thunkDispatch(regionActions.receiveRegionData(ownProps.regionId, regionData))
          return response
        })
      })
    },
    loadVariants() {
      return dispatch(thunkDispatch => {
        thunkDispatch(variantActions.setSelectedVariantDataset(ownProps.datasetId))
        thunkDispatch(variantActions.requestVariants())
        return ownProps.fetchVariants(ownProps.regionId, ownProps.datasetId).then(response => {
          const variantData = response.data.region
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
  class RegionData extends Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      datasetId: PropTypes.string.isRequired,
      loadRegion: PropTypes.func.isRequired,
      loadVariants: PropTypes.func.isRequired,
      regionId: PropTypes.string.isRequired,
    }

    state = {
      isLoadingRegion: false,
      isLoadingVariants: false,
      loadError: null,
      regionData: null,
      variantErrors: null,
    }

    componentDidMount() {
      this.mounted = true
      this.loadRegion()
      this.loadVariants()
    }

    componentDidUpdate(prevProps) {
      if (this.props.regionId !== prevProps.regionId) {
        this.loadRegion()
        this.loadVariants()
      } else if (this.props.datasetId !== prevProps.datasetId) {
        this.loadVariants()
      }
    }

    componentWillUnmount() {
      this.mounted = false
    }

    loadRegion() {
      this.setState({
        isLoadingRegion: true,
        loadError: null,
      })

      this.props.loadRegion().then(
        response => {
          const regionData = response.data.region
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoadingRegion: false,
            regionData,
          })
        },
        () => {
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoadingRegion: false,
            loadError: 'Unable to load region',
          })
        }
      )
    }

    loadVariants() {
      this.setState({
        isLoadingVariants: true,
        variantErrors: null,
      })

      this.props
        .loadVariants()
        .then(response => {
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoadingVariants: false,
            variantErrors: response.errors,
          })
        })
        .catch(() => {
          if (!this.mounted) {
            return
          }
          this.setState({ isLoadingVariants: false })
        })
    }

    render() {
      if (this.state.isLoadingRegion) {
        return <StatusMessage>Loading region...</StatusMessage>
      }

      if (this.state.loadError) {
        return <StatusMessage>{this.state.loadError}</StatusMessage>
      }

      if (this.state.regionData) {
        return this.props.children({
          variantErrors: this.state.variantErrors,
          isLoadingVariants: this.state.isLoadingVariants,
          region: this.state.regionData,
        })
      }

      return null
    }
  }
)

RegionDataContainer.propTypes = {
  children: PropTypes.func.isRequired,
  datasetId: PropTypes.string.isRequired,
  fetchRegion: PropTypes.func.isRequired,
  regionId: PropTypes.string.isRequired,
}

export default RegionDataContainer
