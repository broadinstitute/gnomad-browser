import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

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
  })
)(
  class RegionData extends Component {
    static propTypes = {
      children: PropTypes.func.isRequired,
      loadRegion: PropTypes.func.isRequired,
      regionId: PropTypes.string.isRequired,
    }

    state = {
      isLoadingRegion: false,
      loadError: null,
      regionData: null,
    }

    componentDidMount() {
      this.mounted = true
      this.loadRegion()
    }

    componentDidUpdate(prevProps) {
      const { regionId } = this.props
      if (regionId !== prevProps.regionId) {
        this.loadRegion()
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

      // eslint-disable-next-line react/destructuring-assignment
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

    render() {
      const { children } = this.props
      const { isLoadingRegion, loadError, regionData } = this.state

      if (isLoadingRegion) {
        return <StatusMessage>Loading region...</StatusMessage>
      }

      if (loadError) {
        return <StatusMessage>{loadError}</StatusMessage>
      }

      if (regionData) {
        return children({ region: regionData })
      }

      return null
    }
  }
)

RegionDataContainer.propTypes = {
  children: PropTypes.func.isRequired,
  fetchRegion: PropTypes.func.isRequired,
  regionId: PropTypes.string.isRequired,
}

export default RegionDataContainer
