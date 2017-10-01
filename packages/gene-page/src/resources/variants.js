/* eslint-disable no-shadow */
import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, List } from 'immutable'
import { createSelector } from 'reselect'
import { createSearchAction, getSearchSelectors } from 'redux-search'

import { types as geneTypes } from './genes'
import * as fromActive from './active'

export const types = keymirror({
  REQUEST_VARIANTS_BY_POSITION: null,
  RECEIVE_VARIANTS: null,
  SET_VARIANT_FILTER: null,
  SET_VARIANT_SORT: null,
  ORDER_VARIANTS_BY_POSITION: null,
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
    return (dispatch, getState) => {  // eslint-disable-line
      if (actions.shouldFetchVariants(getState(), xstart, xstop)) {
        return dispatch(actions.fetchVareiantsByStartStop(variantFetchFunction, xstart, xstop))
      }
    }
  },

  setVariantFilter: (filter) => {
    return {
      type: types.SET_VARIANT_FILTER,
      filter,
    }
  },

  setVariantSort: (key) => {
    return {
      type: types.SET_VARIANT_SORT,
      key,
    }
  },

  searchVariants: createSearchAction('variants')
}

export default function createVariantReducer({ variantDatasets, combinedDatasets }) {
  const datasetKeys = Object.keys(variantDatasets).concat(Object.keys(combinedDatasets))

  const State = Record({
    isFetching: false,
    byVariantDataset: datasetKeys.reduce((acc, dataset) =>
      (acc.set(dataset, Map())), OrderedMap()),
    variantSortKey: 'pos',
    variantSortAscending: true,
    variantFilter: 'all',
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

    [types.SET_VARIANT_FILTER] (state, { filter }) {
      return state.set('variantFilter', filter)
    },

    [types.ORDER_VARIANTS_BY_POSITION] (state) {
      return state
        .set('variantSortKey', 'pos')
        .set('variantSortAscending', true)
    },

    [types.SET_VARIANT_SORT] (state, { key }) {
      if (key === state.get('variantSortKey')) {
        return state.set('variantSortAscending', !state.get('variantSortAscending'))
      }
      return state.set('variantSortKey', key)
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

/**
 * Variant selectors
 */

const byVariantDataset = state => state.variants.byVariantDataset

export const allVariantsInCurrentDataset = createSelector(
  [fromActive.currentVariantDataset, byVariantDataset],
  (currentVariantDataset, byVariantDataset) =>
    byVariantDataset.get(currentVariantDataset)
)

export const allVariantsInCurrentDatasetAsList = createSelector(
  [fromActive.currentVariantDataset, byVariantDataset],
  (currentVariantDataset, byVariantDataset) =>
    byVariantDataset.get(currentVariantDataset).toList()
)

export const currentVariantData = createSelector(
  [fromActive.currentVariant, allVariantsInCurrentDataset],
  (currentVariant, variants) => variants.get(currentVariant)
)

/**
 * Sort/filter selectors
 */

export const variantSortKey = state => state.variants.variantSortKey
export const variantSortAscending = state => state.variants.variantSortAscending
export const variantFilter = state => state.variants.variantFilter

const sortVariants = (variants, key, ascending) => (
  ascending ?
    variants.sort((a, b) => a.get(key) - b.get(key)) :
    variants.sort((a, b) => b.get(key) - a.get(key))
)

export const visibleVariantsById = createSelector([
  allVariantsInCurrentDataset,
  variantSortKey,
  variantSortAscending,
  variantFilter
], (variants, variantSortKey, variantSortAscending, variantFilter) => {
  let filteredVariants
  if (variantFilter === 'all') {
    filteredVariants = variants
  }
  if (variantFilter === 'rare') {
    filteredVariants = variants.filter(v => v.get('allele_count') < 2)
  }
  return sortVariants(
    filteredVariants,
    variantSortKey,
    variantSortAscending
  )
})

// export const variantsFilteredByActiveInterval = createSelector(
//   [
//     state => state.variants.byVariantDataset.get('variants'),
//     regionViewerIntervals
//   ],
//   (variants, intervals) => variants.take(10).filter(({ pos }) => {
//     console.log(intervals)
//     const inIntervals = intervals.some(([start, stop]) =>
//       start < pos && pos < stop).sort((a, b) => a.pos - b.pos)
//     console.log(inIntervals)
//     return inIntervals
//   })
// )

/**
 * Redux search selectors
 */

export const resourceSelector = (resourceName, state) => state.resources.get(resourceName)

export const variantSearchResults = getSearchSelectors({
  resourceName: 'variants',
  resourceSelector: allVariantsInCurrentDatasetAsList,
})

export const searchText = variantSearchResults.text

export const searchFilteredVariantIdList = createSelector(
  [variantSearchResults.result],
  result => List(result)
)

export const finalFilteredVariants = createSelector(
  [visibleVariantsById, searchFilteredVariantIdList],
  (visibleVariantsById, searchFilteredVariantIdList) => {
    if (searchFilteredVariantIdList.size === 0) {
      return visibleVariantsById.toList()
    }
    return searchFilteredVariantIdList.map(id => visibleVariantsById.get(id))
  }
)
