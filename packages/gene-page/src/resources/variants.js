/* eslint-disable no-shadow */
import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, List } from 'immutable'
import { createSelector } from 'reselect'
import { createSearchAction, getSearchSelectors } from 'redux-search'

import {
  isCategoryLoF,
  isCategoryMissenseOrLoF,
} from '@broad/utilities/src/constants/categoryDefinitions'

import { getTableIndexByPosition } from '@broad/utilities/src/variant'

import { types as geneTypes } from './genes'
import { types as regionTypes } from './regions'

import * as fromActive from './active'

export const types = keymirror({
  REQUEST_VARIANTS_BY_POSITION: null,
  RECEIVE_VARIANTS: null,
  SET_HOVERED_VARIANT: null,
  SET_FOCUSED_VARIANT: null,
  SET_SELECTED_VARIANT_DATASET: null,
  SET_VARIANT_FILTER: null,
  SET_VARIANT_SORT: null,
  ORDER_VARIANTS_BY_POSITION: null,
})

export const actions = {
  requestVariantsByPosition: (xstart, xstop) => ({
    type: types.REQUEST_VARIANTS_BY_POSITION,
    payload: { xstart, xstop },
  }),

  setHoveredVariant: variantId => ({ type: types.SET_HOVERED_VARIANT, variantId }),

  setFocusedVariant: (variantId, history) => (dispatch, getState) => {
    history.push(`/gene/BRCA2/${variantId}`)
    // HACK way to preserve table state when switching to variant table
    dispatch(fromActive.actions.setCurrentTableIndex(
      getTableIndexByPosition(
        variantId.split('-')[1],
        finalFilteredVariants(getState())
      ) + 7
    ))
    dispatch(({ type: types.SET_FOCUSED_VARIANT, variantId }))
  },

  setSelectedVariantDataset: variantDataset =>
    ({ type: types.SET_SELECTED_VARIANT_DATASET, variantDataset }),

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
        return dispatch(actions.fetchVariantsByStartStop(variantFetchFunction, xstart, xstop))
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

  searchVariantsRaw: createSearchAction('variants'),

  searchVariants(text) {
    const thunk = (dispatch) => {
      return dispatch(actions.searchVariantsRaw(text))
    }
    thunk.meta = {
      debounce: {
        time: 500,
        key: 'SEARCH_VARIANT_TABLE',
      }
    }
    return thunk
  }
}

export default function createVariantReducer({
  variantDatasets,
  combinedDatasets = {},
  projectDefaults: {
    startingVariant,
    startingVariantDataset,
  }
}) {
  const datasetKeys = Object.keys(variantDatasets).concat(Object.keys(combinedDatasets))

  const variantRecords = datasetKeys.reduce((acc, dataset) => {
    if (dataset in variantDatasets) {
      acc[dataset] = Record(variantDatasets[dataset])
    } else if (dataset in combinedDatasets) {
      acc[dataset] = Record(combinedDatasets[dataset].schema)
    }
    return acc
  }, {})
  const State = Record({
    isFetching: false,
    byVariantDataset: datasetKeys.reduce((acc, dataset) =>
      (acc.set(dataset, OrderedMap())), OrderedMap()),
    variantSortKey: 'pos',
    variantSortAscending: true,
    variantFilter: 'all',
    hoveredVariant: startingVariant,
    focusedVariant: startingVariant,
    selectedVariantDataset: startingVariantDataset,
  })

  const actionHandlers = {
    [types.SET_HOVERED_VARIANT] (state, { variantId }) {
      return state.set('hoveredVariant', variantId)
    },

    [types.SET_FOCUSED_VARIANT] (state, { variantId }) {
      return state.set('focusedVariant', variantId)
    },

    [types.SET_SELECTED_VARIANT_DATASET] (state, { variantDataset }) {
      return state.set('selectedVariantDataset', variantDataset)
    },

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
        let variantMap = {}
        if (variantDatasets[datasetKey]) {
          geneData.get(datasetKey).forEach((variant) => {
            variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
              variant
                .set('id', variant.get('variant_id'))
                .set('datasets', Set([datasetKey])))
          })
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
          .set(datasetKey, OrderedMap(variantMap))
        )
      }, state)
    },

    [regionTypes.RECEIVE_REGION_DATA] (state, { regionData }) {
      return datasetKeys.reduce((nextState, datasetKey) => {
        let variantMap = {}
        if (variantDatasets[datasetKey]) {
          regionData.get(datasetKey).forEach((variant) => {
            variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
              variant
                .set('id', variant.get('variant_id'))
                .set('datasets', Set([datasetKey])))
          })
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
          .set(datasetKey, OrderedMap(variantMap))
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

const sortVariants = (variants, key, ascending) => {
  if (key === 'variant_id') {
    return (
      ascending ?
        variants.sort((a, b) => a.get('pos') - b.get('pos')) :
        variants.sort((a, b) => b.get('pos') - a.get('pos'))
    )
  }
  return (
    ascending ?
      variants.sort((a, b) => a.get(key) - b.get(key)) :
      variants.sort((a, b) => b.get(key) - a.get(key))
  )
}

/**
 * Variant selectors
 */

const byVariantDataset = state => state.variants.byVariantDataset
export const hoveredVariant = state => state.variants.hoveredVariant
export const selectedVariantDataset = state => state.variants.selectedVariantDataset
export const variantDatasetKeys = state => state.variants.byVariantDataset.seqKey()

export const allVariantsInCurrentDataset = createSelector(
  [selectedVariantDataset, byVariantDataset],
  (selectedVariantDataset, byVariantDataset) =>
    byVariantDataset.get(selectedVariantDataset)
)

export const allVariantsInCurrentDatasetAsList = createSelector(
  [selectedVariantDataset, byVariantDataset],
  (selectedVariantDataset, byVariantDataset) =>
    sortVariants(byVariantDataset.get(selectedVariantDataset).toList(), 'pos', true)
)

export const variantCount = createSelector(
  [allVariantsInCurrentDatasetAsList],
  variants => variants.size
)

export const singleVariantData = createSelector(
  [hoveredVariant, allVariantsInCurrentDataset],
  (hoveredVariant, variants) => variants.get(hoveredVariant)
)

/**
 * Sort/filter selectors
 */

export const variantSortKey = state => state.variants.variantSortKey
export const variantSortAscending = state => state.variants.variantSortAscending
export const variantFilter = state => state.variants.variantFilter

export const filteredVariantsById = createSelector([
  allVariantsInCurrentDataset,
  variantFilter,
], (variants, variantFilter) => {
  let filteredVariants
  if (variantFilter === 'all') {
    filteredVariants = variants
  }
  if (variantFilter === 'lof') {
    filteredVariants = variants.filter(v => isCategoryLoF(v.get('consequence')))
  }
  if (variantFilter === 'missenseOrLoF') {
    filteredVariants = variants.filter(v => isCategoryMissenseOrLoF(v.get('consequence')))
  }
  return filteredVariants
})

export const visibleVariantsList = createSelector(
  [filteredVariantsById], filteredVariantsById => filteredVariantsById.toList()
)

/**
 * Redux search selectors
 */

const resourceSelector = (resourceName, state) => state.variants.byVariantDataset.get('gnomadCombinedVariants')

const searchSelectors = getSearchSelectors({
  resourceName: 'variants',
  resourceSelector,
})
export const variantSearchText = searchSelectors.text
export const variantSearchResult = searchSelectors.result

export const filteredIdList = createSelector(
  [state => state.search.variants.result],
  (result) => {
    return List(result)
  }
)

export const sortedVariants = createSelector(
  [
    filteredVariantsById,
    variantSortKey,
    variantSortAscending
  ],
  (
    variants,
    variantSortKey,
    variantSortAscending
  ) => {
    const sortedVariants = sortVariants(
      variants,
      variantSortKey,
      variantSortAscending
    )
    return sortedVariants
  }
)

export const finalFilteredVariants = createSelector(
  [sortedVariants, filteredIdList, selectedVariantDataset],
  (variants, filteredIdList, selectedVariantDataset) => {
    if (selectedVariantDataset === 'exacVariants') { // HACK: messes up search
      return variants.toList()
    }
    if (filteredIdList.size !== 0 || variants.size === 0) {
      return variants.filter((v) => {
        return filteredIdList.includes(v.get('id'))
      }).toList()
    }
    return variants.toList()
  }
)

export const finalFilteredVariantsCount = createSelector(
  [finalFilteredVariants],
  finalFilteredVariants => finalFilteredVariants.size
)


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
