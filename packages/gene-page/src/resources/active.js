// @flow
/* eslint-disable space-before-function-paren */
/* eslint-disable comma-dangle */
/* eslint-disable no-shadow */

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'
import { getTableIndexByPosition } from '@broad/utilities/src/variant'
import { allVariantsInCurrentDatasetAsList } from './variants'

export const types = keymirror({
  SET_CURRENT_GENE: null,
  SET_CURRENT_NAVIGATOR_POSITION: null,
  SET_CURRENT_TABLE_INDEX: null,
  SET_CURRENT_TABLE_SCROLL_DATA: null,
  SET_EXON_PADDING: null,
  SET_REGION_VIEWER_ATTRIBUTES: null,
})

export const actions = {
  setCurrentGene: geneName => ({ type: types.SET_CURRENT_GENE, geneName }),

  setNavigatorPosition: navigatorPosition => ({
    type: types.SET_CURRENT_NAVIGATOR_POSITION,
    navigatorPosition,
    meta: {
      throttle: true,
    },
  }),

  setCurrentTableIndex: tableIndex => ({
    type: types.SET_CURRENT_TABLE_INDEX,
    tableIndex,
    meta: {
      throttle: true,
    },
  }),

  setCurrentTableScrollData: tableScrollData => ({
    type: types.SET_CURRENT_TABLE_SCROLL_DATA,
    tableScrollData,
    meta: {
      throttle: true,
    }
  }),

  setRegionViewerAttributes: ({ offsetRegions }) => ({
    type: types.SET_REGION_VIEWER_ATTRIBUTES,
    offsetRegions,
    // positionOffset,
    // xScale,
    // invertOffset,
  }),

  setExonPadding: padding => ({ type: types.SET_EXON_PADDING, padding }),

  setVisibleInTable: (range) => {
    return {
      type: types.SET_VISIBLE_IN_TABLE,
      range,
    }
  },

  onNavigatorClick (tableIndex, position) {
    return (dispatch) => {
      dispatch({ type: types.ORDER_VARIANTS_BY_POSITION })
      dispatch(actions.setCurrentTableIndex(tableIndex))
      dispatch(actions.setNavigatorPosition(position))
    }
  },

}

const actionHandlers = {
  [types.SET_CURRENT_GENE] (state, { geneName }) {
    return state.set('currentGene', geneName)
  },
  [types.SET_CURRENT_NAVIGATOR_POSITION] (state, { navigatorPosition }) {
    return state.set('currentNavigatorPosition', navigatorPosition)
  },
  [types.SET_CURRENT_TABLE_INDEX] (state, { tableIndex }) {
    return state.set('currentTableIndex', tableIndex)
  },
  [types.SET_CURRENT_TABLE_SCROLL_DATA] (state, { tableScrollData }) {
    return state.set('currentTableScrollData', tableScrollData)
  },
  [types.SET_REGION_VIEWER_ATTRIBUTES] (state, {
    offsetRegions,
    positionOffset,
    xScale,
    invertOffset
  }) {
    return state.set('regionViewerAttributes', { offsetRegions, positionOffset, xScale, invertOffset })
  },
  [types.SET_EXON_PADDING] (state, { padding }) {
    return state.set('exonPadding', padding)
  },

  [types.SET_VISIBLE_IN_TABLE] (state, { range }) {
    const [min, max] = state.get('visibleInTable')
    if (min < 0 || max < 0) {
      return state.set('visibleInTable', [0, 15])
    }
    return state.set('visibleInTable', range)
  },
}

export default function createActiveReducer ({
  projectDefaults: {
    startingGene,
    startingPadding,
  }
}) {
  const State = Immutable.Record({
    currentGene: startingGene,
    currentNavigatorPosition: 0,
    currentTableIndex: 0,
    currentTableScrollData: { scrollHeight: 1, scrollTop: 2 },
    exonPadding: startingPadding,
    regionViewerAttributes: {
      offsetRegions: [{ start: 0, stop: 0 }],
      // positionOffset: null,
      // xScale: null,
      // invertOffset: null,
    },
    visibleInTable: [0, 15],
  })
  function reducer (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
  return reducer
}

export const currentGene = state => state.active.currentGene
export const currentNavigatorPosition = state => state.active.currentNavigatorPosition
export const currentTableIndex = state => state.active.currentTableIndex
export const currentTableScrollData = state => state.active.currentTableScrollData
export const exonPadding = state => state.active.exonPadding
export const regionViewerIntervals = state =>
  state.active.regionViewerAttributes.offsetRegions.map(region => [region.start, region.stop])

export const tablePosition = createSelector(
  [currentNavigatorPosition, allVariantsInCurrentDatasetAsList],
  (currentNavigatorPosition, variants) => {
    return getTableIndexByPosition(
      currentNavigatorPosition,
      variants,
    )
  }
)
