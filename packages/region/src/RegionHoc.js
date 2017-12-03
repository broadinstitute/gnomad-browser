/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-shadow */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'

import { currentGene } from '@broad/redux-genes'

import {
  actions as variantActions,
} from '@broad/redux-variants'

import {
  currentRegion,
  regionData,
  isFetching,
  actions as regionActions
} from './index'

const RegionPageContainer = ComposedComponent => class RegionPage extends Component {
  static propTypes = {
    currentRegion: PropTypes.string.isRequired,
    currentGene: PropTypes.string.isRequired,
    regionData: PropTypes.object,
    isFetching: PropTypes.bool.isRequired,
    fetchRegionIfNeeded: PropTypes.func.isRequired,
    setVariantDataset: PropTypes.func,
  }
  static defaultProps = {
    regionData: null,
    setVariantDataset: () => {},
  }

  componentDidMount() {
    const { currentRegion, match, fetchRegionIfNeeded } = this.props
    fetchRegionIfNeeded(currentRegion, match, history)
    this.props.setVariantDataset()
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

const mapDispatchToProps = (regionFetchFunction, variantDataset) => (dispatch) => {
  return {
    fetchRegionIfNeeded: (currentRegion, match) => dispatch(
      regionActions.fetchRegionIfNeeded(currentRegion, match, regionFetchFunction)
    ),
    setVariantDataset: () => dispatch(
      variantActions.setSelectedVariantDataset(variantDataset)
    )
  }
}

const RegionHOC = (
  ComposedComponent,
  regionFetchFunction,
  variantDataset
) => connect(
  mapStateToProps,
  mapDispatchToProps(regionFetchFunction, variantDataset)
)(RegionPageContainer(ComposedComponent))

export default RegionHOC
