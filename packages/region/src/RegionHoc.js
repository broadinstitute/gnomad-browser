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
    queryErrors: null,
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
        response => {
          const regionData = response.data.region
          if (!this.mounted) {
            return
          }
          this.setState({
            isLoading: false,
            queryErrors: response.errors,
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
      return <ComposedComponent errors={this.state.queryErrors} region={this.state.regionData} />
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
          .then(response => {
            const regionData = response.data.region
            thunkDispatch(regionActions.receiveRegionData(regionId, regionData))

            // Reset variant filters when loading a new region
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
    }
  })
)(RegionPageContainer(ComposedComponent))
