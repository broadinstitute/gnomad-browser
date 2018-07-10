/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

export const types = keymirror({
  SET_CURRENT_REGION: null,
  REQUEST_REGION_DATA: null,
  RECEIVE_REGION_DATA: null,
})

export const actions = {
  setCurrentRegion: regionId => ({ type: types.SET_CURRENT_REGION, regionId }),

  requestRegionData: regionId => ({
    type: types.REQUEST_REGION_DATA,
    regionId,
  }),

  receiveRegionData: (regionId, regionData) => ({
    type: types.RECEIVE_REGION_DATA,
    regionId,
    regionData: Immutable.fromJS(regionData),
  }),
}

export default function createRegionReducer({
  variantDatasets,
  projectDefaults: { startingRegion },
}) {
  const variantDatasetKeys = Object.keys(variantDatasets)
  const State = Immutable.Record({
    currentRegion: startingRegion,
    isFetching: false,
    byRegionName: Immutable.OrderedMap(),
    allRegionNames: Immutable.Set(),
  })

  const actionHandlers = {
    [types.SET_CURRENT_REGION] (state, { regionId }) {
      return state.set('currentRegion', regionId)
    },
    [types.REQUEST_REGION_DATA] (state) {
      return state.set('isFetching', true)
    },
    [types.RECEIVE_REGION_DATA] (state, { regionId, regionData }) {
      const regionDataOnly = variantDatasetKeys.reduce((acc, variantDataKey) => {
        return acc.delete(variantDataKey)
      }, regionData)

      return (
        state
          .set('isFetching', false)
          .set('byRegionName', state.byRegionName.set(regionId, regionDataOnly))
          .set('allRegionNames', state.allRegionNames.add(regionId))
      )
    },
  }

  function regions (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
  return regions
}

export const currentRegion = state => state.regions.currentRegion
export const byRegionName = state => state.regions.byRegionName
export const allRegionNames = state => state.regions.allRegionNames
export const isFetching = state => state.regions.isFetching

export const regionData = createSelector(
  [byRegionName, currentRegion],
  (byRegionName, currentRegion) => byRegionName.get(currentRegion),
)
export const currentChromosome = createSelector(
  [regionData],
  regionData => regionData ? regionData.get('chrom') : null
)

