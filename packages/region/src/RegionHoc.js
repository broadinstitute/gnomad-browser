import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { actions as variantActions } from '@broad/redux-variants'
import { Loading } from '@broad/ui'

import { actions as regionActions } from './regionRedux'


const RegionPageContainer = ComposedComponent => class RegionPage extends Component {
  static propTypes = {
    fetchRegionData: PropTypes.func.isRequired,
    regionId: PropTypes.string.isRequired,
  }

  state = {
    isLoading: false,
    loadError: null,
    regionData: null,
  }

  componentDidMount() {
    this.mounted = true
    this.loadRegionData()
  }

  componentWillUnmount() {
    this.mounted = false
  }

  loadRegionData() {
    this.setState({
      isLoading: true,
      loadError: null,
    })

    this.props.fetchRegionData(this.props.regionId)
      .then(
        (regionData) => {
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoading: false,
            regionData,
          })
        },
        () => {
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoading: false,
            loadError: 'Unable to load region data',
          })
        }
      )
  }

  render() {
    if (this.state.isLoading) {
      return (
        <Loading><h1>Loading...</h1></Loading>
      )
    }

    if (this.state.loadError) {
      return (
        <Loading><h1>{this.state.loadError}</h1></Loading>
      )
    }

    if (this.state.regionData) {
      return (
        <ComposedComponent regionData={this.state.regionData} />
      )
    }

    return null
  }
}


export const RegionHoc = (
  ComposedComponent,
  regionFetchFunction,
  variantDataset
) => connect(
  null,
  dispatch => ({
    fetchRegionData(regionId) {
      return dispatch((thunkDispatch) => {
        thunkDispatch(regionActions.setCurrentRegion(regionId))
        thunkDispatch(variantActions.setSelectedVariantDataset(variantDataset))

        thunkDispatch(regionActions.requestRegionData(regionId))
        return regionFetchFunction(regionId)
          .then((regionData) => {
            thunkDispatch(regionActions.receiveRegionData(regionId, regionData))

            const defaultVariantFilter = (regionData.stop - regionData.start) > 50000
              ? 'lof'
              : 'all'

            // Reset variant filters when loading a new region
            thunkDispatch(variantActions.searchVariants(''))
            thunkDispatch(variantActions.setVariantFilter(defaultVariantFilter))

            return regionData
          })
      })
    }
  })
)(RegionPageContainer(ComposedComponent))
