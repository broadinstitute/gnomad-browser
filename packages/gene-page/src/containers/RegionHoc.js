/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import {
  currentRegion,
  regionData,
  isFetching,
  actions as regionActions
} from '../resources/regions'

const RegionPageContainer = ComposedComponent => class RegionPage extends Component {
  static propTypes = {
    currentRegion: PropTypes.string.isRequired,
    regionData: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchRegionIfNeeded: PropTypes.func.isRequired,
  }

  static defaultProps = {
    regionData: null,
  }

  componentDidMount() {
    const { currentRegion, match, fetchRegionIfNeeded } = this.props
    fetchRegionIfNeeded(currentRegion, match, history)
  }

  componentWillReceiveProps(nextProps) {
    const { fetchRegionIfNeeded, currentRegion, history } = this.props
    if (currentRegion !== nextProps.currentRegion) {
      history.push(`/region/${nextProps.currentRegion}`)
      fetchRegionIfNeeded(nextProps.currentRegion)
    }
  }

  render() {
    return <ComposedComponent {...this.props} />
  }
}

const mapStateToProps = state => ({
  isFetching: isFetching(state),
  regionData: regionData(state),
  currentRegion: currentRegion(state),
})

const mapDispatchToProps = regionFetchFunction => (dispatch) => {
  return {
    fetchRegionIfNeeded: (currentRegion, match) => dispatch(
      regionActions.fetchRegionIfNeeded(currentRegion, match, regionFetchFunction)
    ),
  }
}

const RegionHOC = (
  ComposedComponent,
  regionFetchFunction
) => connect(
  mapStateToProps,
  mapDispatchToProps(regionFetchFunction)
)(RegionPageContainer(ComposedComponent))

export default RegionHOC
