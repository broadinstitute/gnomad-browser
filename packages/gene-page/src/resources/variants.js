import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, fromJS } from 'immutable'
import { createSelector } from 'reselect'

import { types as geneTypes } from './genes'
import {
  regionViewerIntervals,
  currentVariant,
  currentVariantDataset,
} from './active'

export const types = keymirror({
  REQUEST_VARIANTS_BY_POSITION: null,
  RECEIVE_VARIANTS: null,
})

export const actions = {
  requestVariantsByPosition: (xstart, xstop) => ({
    type: types.REQUEST_VARIANTS_BY_POSITION,
    payload: { xstart, xstop },
  }),

  receiveVariants: variantData => ({
    type: types.REQUEST_VARIANTS_BY_POSITION,
    payload: variantData,
  }),

  fetchVariantsByStartStop(variantFetchFunction, xstart, xstop) {
    return (dispatch) => {
      dispatch(actions.requestVariantsByPosition(xstart, xstop))
      variantFetchFunction(xstart, xstop).then((variantData) => {
        dispatch(actions.receiveVariants(variantData))
      })
    }
  },

  shouldFetchVariants (state, xstart, xstop) {
    return true
  },

  fetchVariantsIfNeeded(xstart, xstop, variantFetchFunction) {
    return (dispatch, getState) => {
      if (actions.shouldFetchVariants(getState(), xstart, xstop)) {
        return dispatch(actions.fetchVareiantsByStartStop(variantFetchFunction, xstart, xstop))
      }
    }
  }
}

export default function createVariantReducer({ variantDatasets, combinedDatasets }) {
  const datasetKeys = Object.keys(variantDatasets).concat(Object.keys(combinedDatasets))

  const State = Record({
    isFetching: false,
    byVariantDataset: datasetKeys.reduce((acc, dataset) =>
      (acc.set(dataset, Map())), OrderedMap()),
  })

  const actionHandlers = {
    [types.REQUEST_VARIANTS_BY_POSITION] (state) {
      return state.set('isFetching', true)
    },

    [types.RECEIVE_VARIANTS] (state, payload) {
      return datasetKeys.reduce((nextState, dataset) => {
        return nextState.byVariantDataset.set(
          dataset,
          nextState.byVariantDataset
            .get(dataset)
            .merge(payload[dataset].map(v => ([v.variant_id, v])))
        )
      }, state).set('isFetching', false)
    },

    [geneTypes.RECEIVE_GENE_DATA] (state, { geneData }) {
      return datasetKeys.reduce((nextState, datasetKey) => {
        let variantMap
        if (variantDatasets[datasetKey]) {
          variantMap = Map(geneData.get(datasetKey).map(v =>
            ([
              v.get('variant_id'),
              v.set('id', v.get('variant_id'))
                .set('datasets', Set([datasetKey]))
            ])
          ))
        } else if (combinedDatasets[datasetKey]) {
          const sources = combinedDatasets[datasetKey].sources
          const combineKeys = combinedDatasets[datasetKey].combineKeys
          variantMap = sources.reduce((acc, dataset) => {
            return acc.mergeDeepWith((oldValue, newValue, key) => {
              if (combineKeys[key]) {
                return combineKeys[key](oldValue, newValue)
              }
              return oldValue
            }, nextState.byVariantDataset.get(dataset))
          }, OrderedMap())
        }
        return nextState.set('byVariantDataset', nextState.byVariantDataset
          .set(datasetKey, variantMap)
        )
      }, state)
    },
  }

  return function variants (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
}

const byVariantDataset = state => state.variants.byVariantDataset

export const allVariantsInCurrentDatasetAsList = createSelector(
  [currentVariantDataset, byVariantDataset],
  (currentVariantDataset, byVariantDataset) =>
    byVariantDataset.get(currentVariantDataset).toList()
)

// export const allVariants = createSelector(
//   [state => state.variants.byVariantDataset.get('gnomadGenomeVariants')],
//   variants => variants.toList()
// )

// export const currentVariantData = createSelector(
//   [currentVariant, state => state.variants.byVariantDataset.get('variants')],
//   (currentVariant, variants) => variants.get(currentVariant)
// )

export const variantsFilteredByActiveInterval = createSelector(
  [
    state => state.variants.byVariantDataset.get('variants'),
    regionViewerIntervals
  ],
  (variants, intervals) => variants.take(10).filter(({ pos }) => {
    console.log(intervals)
    const inIntervals = intervals.some(([start, stop]) =>
      start < pos && pos < stop).sort((a, b) => a.pos - b.pos)
    console.log(inIntervals)
    return inIntervals
  })
)
