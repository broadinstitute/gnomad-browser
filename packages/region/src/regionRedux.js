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

export default function createRegionReducer() {
  const State = Immutable.Record({
    currentRegion: null,
    byRegionName: Immutable.OrderedMap(),
  })

  const actionHandlers = {
    [types.SET_CURRENT_REGION](state, { regionId }) {
      return state.set('currentRegion', regionId)
    },
    [types.RECEIVE_REGION_DATA](state, { regionId, regionData }) {
      return state.set('byRegionName', state.byRegionName.set(regionId, regionData))
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
const byRegionName = state => state.regions.byRegionName

export const regionData = createSelector(
  [byRegionName, currentRegion],
  (byRegionName, currentRegion) => byRegionName.get(currentRegion),
)
export const currentChromosome = createSelector(
  [regionData],
  regionData => regionData ? regionData.get('chrom') : null
)

