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

import {
  currentGene
} from '../resources/active'

import {
  actions as geneActions,
} from '../resources/genes'

const RegionPageContainer = ComposedComponent => class RegionPage extends Component {
  static propTypes = {
    currentRegion: PropTypes.string.isRequired,
    currentGene: PropTypes.string.isRequired,
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
    const { fetchRegionIfNeeded, currentRegion, currentGene, history } = this.props
    if (currentRegion !== nextProps.currentRegion) {
      history.push(`/region/${nextProps.currentRegion}`)
      fetchRegionIfNeeded(nextProps.currentRegion)
    }
    if (currentGene !== nextProps.currentGene) {
      history.push(`/gene/${nextProps.currentGene}`)
      location.reload()
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
  currentGene: currentGene(state),
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
