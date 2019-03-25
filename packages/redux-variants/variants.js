/* eslint-disable no-shadow */
import keymirror from 'keymirror'
import { Record, Map, List, fromJS } from 'immutable'
import { createSelector } from 'reselect'

import { types as geneTypes } from '@broad/redux-genes'
import { getCategoryFromConsequence } from '@broad/utilities'

export const types = keymirror({
  REQUEST_VARIANTS: null,
  RECEIVE_VARIANTS: null,
  SET_HOVERED_VARIANT: null,
  SET_FOCUSED_VARIANT: null,
  SET_SELECTED_VARIANT_DATASET: null,
  SET_VARIANT_FILTER: null,
  SET_VARIANT_SEARCH_QUERY: null,
  SET_VARIANT_SORT: null,
  TOGGLE_VARIANT_INDEL_FILTER: null,
  TOGGLE_VARIANT_QC_FILTER: null,
  TOGGLE_VARIANT_SNP_FILTER: null,
  ORDER_VARIANTS_BY_POSITION: null,
  TOGGLE_DENOVO_FILTER: null,
  TOGGLE_IN_ANALYSIS_FILTER: null,
})

export const actions = {
  requestVariants: () => ({ type: types.REQUEST_VARIANTS }),

  receiveVariants: variantData => ({
    type: types.RECEIVE_VARIANTS,
    variantData: fromJS(variantData),
  }),

  setHoveredVariant: variantId => ({ type: types.SET_HOVERED_VARIANT, variantId }),

  setFocusedVariant: variantId => ({ type: types.SET_FOCUSED_VARIANT, variantId }),

  setSelectedVariantDataset: variantDataset =>
    ({ type: types.SET_SELECTED_VARIANT_DATASET, variantDataset }),

  setVariantFilter: filter => ({
    type: types.SET_VARIANT_FILTER,
    filter,
  }),

  setVariantSort: (key) => {
    return {
      type: types.SET_VARIANT_SORT,
      key,
    }
  },
  toggleVariantIndelFilter: () => {
    return {
      type: types.TOGGLE_VARIANT_INDEL_FILTER,
    }
  },
  toggleVariantQcFilter: () => {
    return {
      type: types.TOGGLE_VARIANT_QC_FILTER,
    }
  },
  toggleVariantSnpFilter: () => {
    return {
      type: types.TOGGLE_VARIANT_SNP_FILTER,
    }
  },
  toggleVariantDeNovoFilter: () => {
    return {
      type: types.TOGGLE_DENOVO_FILTER,
    }
  },

  toggleVariantInAnalysisFilter() {
    return {
      type: types.TOGGLE_IN_ANALYSIS_FILTER,
    }
  },

  searchVariants(query) {
    const thunk = (dispatch) => {
      return dispatch({
        type: types.SET_VARIANT_SEARCH_QUERY,
        query,
      })
    }
    thunk.meta = {
      debounce: {
        time: 500,
        key: 'SEARCH_VARIANT_TABLE',
      }
    }
    return thunk
  },
}

const defaultVariantMatchesConsequenceCategoryFilter = (variant, selectedConsequenceCategories) => {
  const category = getCategoryFromConsequence(variant.consequence) || 'other'
  return selectedConsequenceCategories[category]
}

export default function createVariantReducer({
  variantDatasets,
  variantMatchesConsequenceCategoryFilter,
  variantSearchPredicate,
  projectDefaults: {
    startingVariant,
    startingVariantDataset,
    startingIndelFilter,
    startingQcFilter,
    startingSnpFilter,
  }
}) {
  const datasetKeys = Object.keys(variantDatasets)
  const variantRecords = datasetKeys.reduce(
    (acc, dataset) => ({
      ...acc,
      [dataset]: Record(variantDatasets[dataset]),
    }),
    {}
  )

  const State = Record({
    byVariantDataset: datasetKeys.reduce((acc, dataset) =>
      (acc.set(dataset, Map())), Map()),
    variantSortKey: 'pos',
    variantSortAscending: true,
    variantFilter: {
      lof: true,
      missense: true,
      synonymous: true,
      other: true,
    },
    hoveredVariant: startingVariant,
    focusedVariant: startingVariant,
    isLoadingVariants: false,
    selectedVariantDataset: startingVariantDataset,
    variantIndelFilter: startingIndelFilter,
    variantQcFilter: startingQcFilter,
    variantSnpFilter: startingSnpFilter,
    variantDeNovoFilter: false,
    variantInAnalysisFilter: false,
    variantMatchesConsequenceCategoryFilter:
      variantMatchesConsequenceCategoryFilter || defaultVariantMatchesConsequenceCategoryFilter,
    searchPredicate: variantSearchPredicate,
    searchQuery: '',
  })

  const actionHandlers = {
    [types.SET_HOVERED_VARIANT] (state, { variantId }) {
      return state.set('hoveredVariant', variantId)
    },

    [types.SET_FOCUSED_VARIANT] (state, { variantId }) {
      return state.set('focusedVariant', variantId)
    },

    [types.SET_VARIANT_SEARCH_QUERY] (state, { query }) {
      return state.set('searchQuery', query)
    },

    [types.SET_SELECTED_VARIANT_DATASET] (state, { variantDataset }) {
      return state.set('selectedVariantDataset', variantDataset)
    },

    [geneTypes.RECEIVE_GENE_DATA](state, { geneData }) {
      return datasetKeys.reduce((nextState, datasetKey) => {
        if (geneData.get(datasetKey)) {
          const variantMap = {}
          geneData.get(datasetKey).forEach(variant => {
            variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
              variant.set('id', variant.get('variant_id'))
            )
          })
          return nextState.set(
            'byVariantDataset',
            nextState.byVariantDataset.set(datasetKey, Map(variantMap))
          )
        }
        return nextState
      }, state)
    },

    [types.REQUEST_VARIANTS](state) {
      return state.set('isLoadingVariants', true)
    },

    [types.RECEIVE_VARIANTS](state, { variantData }) {
      return datasetKeys
        .reduce((nextState, datasetKey) => {
          if (variantData.get(datasetKey)) {
            const variantMap = {}
            variantData.get(datasetKey).forEach(variant => {
              variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
                variant.set('id', variant.get('variant_id'))
              )
            })
            return nextState.set(
              'byVariantDataset',
              nextState.byVariantDataset.set(datasetKey, Map(variantMap))
            )
          }
          return nextState.set(
            'byVariantDataset',
            nextState.byVariantDataset.set(datasetKey, Map({}))
          )
        }, state)
        .set('isLoadingVariants', false)
    },

    [types.SET_VARIANT_FILTER] (state, { filter }) {
      return state.set('variantFilter', filter)
    },

    [types.ORDER_VARIANTS_BY_POSITION] (state) {
      return state
        .set('variantSortKey', 'pos')
        .set('variantSortAscending', true)
    },

    [types.SET_VARIANT_SORT](state, { key }) {
      if (key === state.get('variantSortKey')) {
        return state.set('variantSortAscending', !state.get('variantSortAscending'))
      }
      return state.set('variantSortKey', key).set('variantSortAscending', false)
    },
    [types.TOGGLE_VARIANT_INDEL_FILTER] (state) {
      return state.set('variantIndelFilter', !state.get('variantIndelFilter'))
    },
    [types.TOGGLE_VARIANT_QC_FILTER] (state) {
      return state.set('variantQcFilter', !state.get('variantQcFilter'))
    },
    [types.TOGGLE_VARIANT_SNP_FILTER] (state) {
      return state.set('variantSnpFilter', !state.get('variantSnpFilter'))
    },
    [types.TOGGLE_DENOVO_FILTER] (state) {
      return state.set('variantDeNovoFilter', !state.get('variantDeNovoFilter'))
    },
    [types.TOGGLE_IN_ANALYSIS_FILTER](state) {
      return state.set('variantInAnalysisFilter', !state.get('variantInAnalysisFilter'))
    },
  }

  return function variants (state = new State(), action) {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
}

function isEmpty(val) {
  return (
    val === undefined
    || val === null
    || val === ''
  )
}

const sortVariants = (variants, key, ascending) => {
  if (variants.isEmpty()) {
    return new List()
  }

  let getSortVal = variant => variant.get(key)
  let comparator = (a, b) => a - b

  if (typeof variants.first().get(key) === 'string') {
    getSortVal = variant => typeof variant.get(key) === 'string' ? variant.get(key) : ''
    comparator = (a, b) => a.localeCompare(b)
  }
  else if (key === 'variant_id') {
    getSortVal = variant => variant.get('pos')
  }
  else if (key === 'datasets') {
    getSortVal = variant => variant.get('datasets').first()
  }
  else if (key === 'flags') {
    getSortVal = variant => variant.get('flags').filter(flag => flag !== 'segdup').size
  }

  const sorter = ascending
    ? comparator
    : (a, b) => comparator(b, a)

  return variants.sort((variantA, variantB) => {
    const sortValA = getSortVal(variantA)
    const sortValB = getSortVal(variantB)

    // Always sort variants with no data for the selected field to the bottom of the list.
    if (isEmpty(sortValA)) {
      return 1
    }
    if (isEmpty(sortValB)) {
      return -1
    }
    return sorter(sortValA, sortValB)
  }).toList()
}

/**
 * Variant selectors
 */

export const isLoadingVariants = state => state.variants.isLoadingVariants
const byVariantDataset = state => state.variants.byVariantDataset
export const hoveredVariant = state => state.variants.hoveredVariant
export const focusedVariant = state => state.variants.focusedVariant
export const selectedVariantDataset = state => state.variants.selectedVariantDataset

export const allVariantsInCurrentDataset = createSelector(
  [selectedVariantDataset, byVariantDataset],
  (selectedVariantDataset, byVariantDataset) =>
    byVariantDataset.get(selectedVariantDataset)
)

export const variantCount = createSelector(
  [selectedVariantDataset, byVariantDataset],
  (selectedVariantDataset, byVariantDataset) => byVariantDataset.get(selectedVariantDataset).size
)

export const singleVariantData = createSelector(
  [focusedVariant, allVariantsInCurrentDataset],
  (focusedVariant, variants) => focusedVariant ? variants.get(focusedVariant) : null
)

/**
 * Sort/filter selectors
 */

export const variantSortKey = state => state.variants.variantSortKey
export const variantSortAscending = state => state.variants.variantSortAscending
export const variantFilter = state => state.variants.variantFilter
export const variantIndelFilter = state => state.variants.variantIndelFilter
export const variantQcFilter = state => state.variants.variantQcFilter
export const variantSnpFilter = state => state.variants.variantSnpFilter
export const variantDeNovoFilter = state => state.variants.variantDeNovoFilter
export const variantInAnalysisFilter = state => state.variants.variantInAnalysisFilter
const variantMatchesConsequenceCategoryFilter = state =>
  state.variants.variantMatchesConsequenceCategoryFilter
const searchPredicate = state => state.variants.searchPredicate
export const variantSearchQuery = state => state.variants.get('searchQuery')

const filteredVariantsById = createSelector(
  [
    allVariantsInCurrentDataset,
    variantFilter,
    variantIndelFilter,
    variantQcFilter,
    variantSnpFilter,
    variantDeNovoFilter,
    variantInAnalysisFilter,
    variantMatchesConsequenceCategoryFilter,
    searchPredicate,
    variantSearchQuery,
  ],
  (
    variants,
    variantFilter,
    variantIndelFilter,
    variantQcFilter,
    variantSnpFilter,
    variantDeNovoFilter,
    variantInAnalysisFilter,
    variantMatchesConsequenceCategoryFilter,
    searchPredicate,
    searchQuery
  ) => {
    let filteredVariants = variants

    const isEveryConsequenceCategorySelected =
      variantFilter.lof && variantFilter.missense && variantFilter.synonymous && variantFilter.other

    if (!isEveryConsequenceCategorySelected) {
      filteredVariants = variants.filter(variant =>
        variantMatchesConsequenceCategoryFilter(variant, variantFilter)
      )
    }

    if (variantQcFilter) {
      filteredVariants = filteredVariants.filter(v => v.get('filters').size === 0)
    }
    if (variantDeNovoFilter) {
      filteredVariants = filteredVariants.filter(v => v.get('ac_denovo') > 0)
    }
    if (variantInAnalysisFilter) {
      filteredVariants = filteredVariants.filter(v => v.get('in_analysis'))
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredVariants = filteredVariants.filter(v => searchPredicate(v, query))
    }

    // Indel and Snp filters.
    filteredVariants = filteredVariants.filter(v => {
      const splits = v.get('variant_id').split('-')
      if (splits.length === 4) {
        // ref and alt are extracted from variant id.
        const refLength = splits[2].length
        const altLength = splits[3].length

        const isSnp = refLength === 1 && altLength === 1
        const isIndel = refLength !== altLength

        if ((variantSnpFilter && isSnp) || (variantIndelFilter && isIndel)) {
          return true
        }
      }
      return false
    })

    return filteredVariants
  }
)

export const finalFilteredVariants = createSelector(
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
