// @flow
/* eslint-disable space-before-function-paren */
/* eslint-disable comma-dangle */

import Immutable from 'immutable'
import keymirror from 'keymirror'

// HACK
// const getDefaultsForProject = (env) => {
//   switch (env) {
//     case 'gnomad':
//       return { startingGene: 'CFTR', padding: 75 }
//     case 'schizophrenia':
//       return { startingGene: 'GRIN2A', padding: 75 }
//     case 'dblof':
//       return { startingGene: 'CD33', padding: 75 }
//     case 'variantfx':
//       return { startingGene: 'MYH7', padding: 75, startingVariant: '14-23902974-C-A' }
//     default:
//       return { startingGene: 'PCSK9', padding: 75 }
//   }
// }

export const types = keymirror({
  SET_CURRENT_GENE: null,
  SET_CURRENT_VARIANT: null,
  SET_CURRENT_VARIANT_DATASET: null,
  SET_CURRENT_NAVIGATOR_POSITION: null,
  SET_CURRENT_TABLE_INDEX: null,
  SET_CURRENT_TABLE_SCROLL_DATA: null,
  SET_EXON_PADDING: null,
  SET_REGION_VIEWER_ATTRIBUTES: null,
  ORDER_VARIANTS_BY_POSITION: null,
})

export const actions = {
  setCurrentGene: geneName => ({ type: types.SET_CURRENT_GENE, geneName }),
  setCurrentVariant: variantId => ({ type: types.SET_CURRENT_VARIANT, variantId }),
  setCurrentVariantDataset: variantDataset =>
    ({ type: types.SET_CURRENT_VARIANT_DATASET, variantDataset }),

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

  setRegionViewerAttributes: ({ offsetRegions }) => ({
    type: types.SET_REGION_VIEWER_ATTRIBUTES,
    offsetRegions,
    // positionOffset,
    // xScale,
    // invertOffset,
  }),

  setExonPadding: padding => ({ type: types.SET_EXON_PADDING, padding }),

  onNavigatorClick (tableIndex, position) {
    return (dispatch) => {
      dispatch({ type: types.ORDER_VARIANTS_BY_POSITION })
      dispatch(actions.setCurrentTableIndex(tableIndex))
      dispatch(actions.setNavigatorPosition(position))
    }
  }
}

const actionHandlers = {
  [types.SET_CURRENT_GENE] (state, { geneName }) {
    return state.set('currentGene', geneName)
  },
  [types.SET_CURRENT_VARIANT] (state, { variantId }) {
    return state.set('currentVariant', variantId)
  },
  [types.SET_CURRENT_VARIANT_DATASET] (state, { variantDataset }) {
    return state.set('currentVariantDataset', variantDataset)
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
  [types.SET_REGION_VIEWER_ATTRIBUTES] (state, { offsetRegions, positionOffset, xScale, invertOffset }) {
    return state.set('regionViewerAttributes', { offsetRegions, positionOffset, xScale, invertOffset })
  },
  [types.SET_EXON_PADDING] (state, { padding }) {
    return state.set('exonPadding', padding)
  },
}

export default function ({
  projectDefaults: {
    startingGene,
    startingVariant,
    startingPadding,
    startingVariantDataset,
  }
}) {
  const State = Immutable.Record({
    currentGene: startingGene,
    currentVariant: startingVariant,
    currentVariantDataset: startingVariantDataset,
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
export const currentVariant = state => state.active.currentVariant
export const currentVariantDataset = state => state.active.currentVariantDataset
export const currentNavigatorPosition = state => state.active.currentNavigatorPosition
export const currentTableIndex = state => state.active.currentTableIndex
export const currentTableScrollData = state => state.active.currentTableScrollData
export const exonPadding = state => state.active.exonPadding
export const regionViewerIntervals = state =>
  state.active.regionViewerAttributes.offsetRegions.map(region => [region.start, region.stop])
