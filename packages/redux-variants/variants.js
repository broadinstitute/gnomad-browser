/* eslint-disable no-shadow */
import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, List, fromJS } from 'immutable'
import { createSelector } from 'reselect'
import { createSearchAction, getSearchSelectors } from 'redux-search'

import {
  isCategoryLoF,
  isCategoryMissenseOrLoF,
  getTableIndexByPosition,
  gnomadExportCsvTranslations,
} from '@broad/utilities'

import { types as regionTypes } from '@broad/region'
import { actions as tableActions } from '@broad/table'
import { types as geneTypes, currentTranscript } from '@broad/redux-genes'

export const types = keymirror({
  REQUEST_VARIANTS: null,
  RECEIVE_VARIANTS: null,
  SET_HOVERED_VARIANT: null,
  SET_FOCUSED_VARIANT: null,
  SET_SELECTED_VARIANT_DATASET: null,
  SET_VARIANT_FILTER: null,
  SET_VARIANT_SORT: null,
  TOGGLE_VARIANT_QC_FILTER: null,
  ORDER_VARIANTS_BY_POSITION: null,
  TOGGLE_DENOVO_FILTER: null,
})

export const actions = {
  setHoveredVariant: variantId => ({ type: types.SET_HOVERED_VARIANT, variantId }),

  setFocusedVariant: (variantId, history) => (dispatch, getState) => {
    // history.push(`/gene/BRCA2/${variantId}`)
    // HACK way to preserve table state when switching to variant table
    // dispatch(tableActions.setCurrentTableIndex(
    //   getTableIndexByPosition(
    //     variantId.split('-')[1],
    //     finalFilteredVariants(getState())
    //   ) + 7
    // ))
    dispatch(({ type: types.SET_FOCUSED_VARIANT, variantId }))
  },

  setSelectedVariantDataset: variantDataset =>
    ({ type: types.SET_SELECTED_VARIANT_DATASET, variantDataset }),

  requestVariants: () => ({
    type: types.REQUEST_VARIANTS,
    // payload: { xstart, xstop },
  }),

  receiveVariants: variantData => ({
    type: types.REQUEST_VARIANTS,
    payload: fromJS(variantData),
  }),

  fetchVariantsByGene (geneName, fetchFunction) {
    return (dispatch, getState) => {
      const state = getState()
      // const options = {
      //   variantFilter: variantFilter(state),
      // }
      dispatch(actions.requestVariants(geneName))
      fetchFunction(geneName)
        .then((variantData) => {
          dispatch(actions.receiveVariants(variantData))
        })
    }
  },

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
  toggleVariantQcFilter: () => {
    return {
      type: types.TOGGLE_VARIANT_QC_FILTER,
    }
  },
  toggleVariantDeNovoFilter: () => {
    return {
      type: types.TOGGLE_DENOVO_FILTER,
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
  },

  exportVariantsToCsv: (fetchFunction) => {
    const sum = (oldValue, newValue) => oldValue + newValue
    const concat = (oldValue, newValue) => oldValue.concat(newValue)
    const combineKeys = {
      allele_count: sum,
      allele_num: sum,
      hom_count: sum,
      filter: concat,
      // allele_freq: () => null,
      datasets: [],
    }
    return (dispatch, getState) => {
      // function flatten (map) {
      //
      // }
      const populations = new Map({
        NFE: 'european_non_finnish',
        EAS: 'east_asian',
        OTH: 'other',
        AFR: 'african',
        AMR: 'latino',
        SAS: 'south_asian',
        FIN: 'european_finnish',
        ASJ: 'ashkenazi_jewish',
      })

      const popDatatypes = ['pop_acs', 'pop_ans', 'pop_homs', 'pop_hemi']

      function flattenForCsv (data) {
        const dataMap = new Map(fromJS(data).map(v => List([v.get('variant_id'), v])))

        const qualityMetricKeys = dataMap.first().get('quality_metrics').keySeq()
        return dataMap.map((value) => {
          const flattened = popDatatypes.reduce((acc, popDatatype) => {
            return populations.valueSeq().reduce((acc, popKey) => {
              return acc.set(`${popDatatype}_${popKey}`, acc.getIn([popDatatype, popKey]))
            }, acc)
          }, value)
          const deletePopMap = popDatatypes.reduce((acc, popDatatype) =>
            acc.delete(popDatatype), flattened)
          const flattenedQualityMetrics = qualityMetricKeys.reduce((acc, key) => {
            return acc.set(`quality_metrics_${key}`, acc.getIn(['quality_metrics', key]))
          }, deletePopMap)
          return flattenedQualityMetrics.delete('quality_metrics')
        })
      }

      function formatData(data) {
        const variants = fromJS(data)
        const dictionary = OrderedMap(gnomadExportCsvTranslations)
        const renamed = variants.map((variant) => {
          return dictionary.mapEntries(([key, value]) => [value, variant.get(key)])
          // return variant.mapKeys((key) => gnomadExportCsvTranslations[key])
        })
        return renamed.sort((a, b) => b.get('XPOS') - a.get('XPOS'))
      }

      function exportToCsv (flattenedData, dataset) {
        const data = flattenedData.toIndexedSeq().map((variant) => {
          return variant.valueSeq().join(',')
        }).join('\r\n')
        const headers = flattenedData.first().keySeq().join(',')
        const csv = `data:text/csv;charset=utf-8,${headers}\n${data}\r\n`
        const encodedUri = encodeURI(csv)
        // window.open(encodedUri)
        const link = document.createElement('a')
        link.setAttribute('href', encodedUri)
        link.setAttribute('download', `${dataset}_${new Date().getTime()}`)
        document.body.appendChild(link)
        link.click()
      }

      const state = getState()
      const currentDataset = selectedVariantDataset(state)
      const filteredVariants = finalFilteredVariants(state)
      const transcriptId = currentTranscript(state)
      const variantIds = filteredVariants.map(v => v.variant_id)

      if (currentDataset === 'gnomadCombinedVariants') {
        return Promise.all([
          fetchFunction(variantIds, transcriptId, 'gnomadExomeVariants'),
          fetchFunction(variantIds, transcriptId, 'gnomadGenomeVariants'),
        ]).then((promiseArray) => {
          const [exomeData, genomeData] = promiseArray
          console.log(exomeData)
          const exomeDataMapFlattened = flattenForCsv(exomeData)
          const genomeDataMapFlattened = flattenForCsv(genomeData)
          const combined = exomeDataMapFlattened.mergeDeepWith((oldValue, newValue, key) => {
            if (combineKeys[key]) {
              return combineKeys[key](oldValue, newValue)
            }
            return oldValue
          }, genomeDataMapFlattened)
          console.log(combined)
          exportToCsv(formatData(combined), currentDataset)
        })
      }

      fetchFunction(variantIds, transcriptId, currentDataset)
        .then((data) => {
          const variantDataMap = formatData(flattenForCsv(data))
          exportToCsv(variantDataMap, currentDataset)
        })
    }
  }
}

export default function createVariantReducer({
  variantDatasets,
  combinedDatasets = {},
  projectDefaults: {
    startingVariant,
    startingVariantDataset,
    startingQcFilter,
  },
  definitions
}) {
  const datasetKeys = Object.keys(variantDatasets).concat(Object.keys(combinedDatasets))
  console.log(datasetKeys)
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
    variantQcFilter: startingQcFilter,
    variantDeNovoFilter: false,
    searchIndexed: OrderedMap(),
    definitions: Map(definitions),
  })

  const actionHandlers = {
    [types.SET_HOVERED_VARIANT] (state, { variantId }) {
      return state.set('hoveredVariant', variantId)
    },

    [types.SET_FOCUSED_VARIANT] (state, { variantId }) {
      return state.set('focusedVariant', variantId)
    },

    [types.SET_SELECTED_VARIANT_DATASET] (state, { variantDataset }) {
      const variants = state
        .getIn(['byVariantDataset', variantDataset])

      return state
        .set('selectedVariantDataset', variantDataset)
        .set('searchIndexed', variants)
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
      if (geneData === null) {
        return state.set('isFetching', false)
      }
      const exons = geneData.getIn(['transcript', 'exons']).toJS()
      const padding = 75
      const totalBasePairs = exons.filter(region => region.feature_type === 'CDS')
        .reduce((acc, { start, stop }) => (acc + ((stop - start) + (padding * 2))), 0)

      let defaultFilter = 'all'
      if (totalBasePairs > 40000) {
        defaultFilter = 'lof'
      } else if (totalBasePairs > 15000) {
        defaultFilter = 'missenseOrLoF'
      }

      const withVariants = datasetKeys.reduce((nextState, datasetKey) => {
        let variantMap = {}
        if (geneData.get(datasetKey) && variantDatasets[datasetKey]) {
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
        return nextState
          .set('byVariantDataset', nextState.byVariantDataset
            .set(datasetKey, OrderedMap(variantMap))
          )
      }, state)

      const currentVariantDataset = withVariants
        .get('byVariantDataset')
        .get(withVariants.selectedVariantDataset)

      return withVariants
        .set('searchIndexed', currentVariantDataset)
        .set('variantFilter', defaultFilter)
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
    [types.TOGGLE_VARIANT_QC_FILTER] (state) {
      return state.set('variantQcFilter', !state.get('variantQcFilter'))
    },
    [types.TOGGLE_DENOVO_FILTER] (state) {
      return state.set('variantDeNovoFilter', !state.get('variantDeNovoFilter'))
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
  if (variants.isEmpty()) return new List()
  if (typeof variants.first().get(key) === 'string') {
    const sorted = variants.sort((a, b) => {
      const first = typeof a.get(key) === 'string' ? a.get(key) : ''
      const second = typeof b.get(key) === 'string' ? b.get(key) : ''
      return first.localeCompare(second)
    })
    return (
      ascending ?
        sorted :
        sorted.reverse()
    )
  }
  if (key === 'variant_id') {
    return (
      ascending ?
        variants.sort((a, b) => a.get('pos') - b.get('pos')) :
        variants.sort((a, b) => b.get('pos') - a.get('pos'))
    )
  }
  if (key === 'datasets') {
    return (
      ascending ?
        variants.sort((a, b) => a.get('datasets').first() - b.get('datasets').first()) :
        variants.sort((a, b) => b.get('datasets').first() - a.get('datasets').first())
    )
  }
  if (key === 'flags') {
    return (
      variants.sort((a, b) => {
        const aFlags = List(['lcr', 'segdup', 'lof']).map(flag => a.get(flag)).filter(flag => flag !== null)
        const bFlags = List(['lcr', 'segdup', 'lof']).map(flag => b.get(flag)).filter(flag => flag !== null)
        return (
          ascending ?
            aFlags.first() - bFlags.first() :
            bFlags.first() - aFlags.first()
        )
      })
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
export const isFetching = state => state.variants.isFetching
export const hoveredVariant = state => state.variants.hoveredVariant
export const focusedVariant = state => state.variants.focusedVariant
export const selectedVariantDataset = state => state.variants.selectedVariantDataset
export const variantDatasetKeys = state => state.variants.byVariantDataset.seqKey()

export const allVariantsInCurrentDataset = createSelector(
  [selectedVariantDataset, byVariantDataset],
  (selectedVariantDataset, byVariantDataset) =>
    byVariantDataset.get(selectedVariantDataset)
)

export const createVariantDatasetSelector = variantDataset => createSelector(
  [byVariantDataset],
  byVariantDataset => sortVariants(byVariantDataset.get(variantDataset).toList(), 'pos', true)
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
  [focusedVariant, allVariantsInCurrentDataset],
  (focusedVariant, variants) => variants.get(focusedVariant)
)

/**
 * Sort/filter selectors
 */

export const variantSortKey = state => state.variants.variantSortKey
export const variantSortAscending = state => state.variants.variantSortAscending
export const variantFilter = state => state.variants.variantFilter
export const variantQcFilter = state => state.variants.variantQcFilter
export const variantDeNovoFilter = state => state.variants.variantDeNovoFilter
export const definitions = state => state.variants.definitions

export const filteredVariantsById = createSelector([
  allVariantsInCurrentDataset,
  variantFilter,
  variantQcFilter,
  definitions,
  variantDeNovoFilter,
], (variants, variantFilter, variantQcFilter, definitions, variantDeNovoFilter) => {
  let filteredVariants
  const consequenceKey = definitions.get('consequence') || 'consequence'
  if (variantFilter === 'all') {
    filteredVariants = variants
  }
  if (variantFilter === 'lof') {
    filteredVariants = variants.filter(v => isCategoryLoF(v.get(consequenceKey)))
  }
  if (variantFilter === 'missenseOrLoF') {
    filteredVariants = variants.filter(v => isCategoryMissenseOrLoF(v.get(consequenceKey)))
  }
  if (variantQcFilter) {
    filteredVariants = filteredVariants.filter(v => v.get('filters').size === 0)
  }
  if (variantDeNovoFilter) {
    filteredVariants = filteredVariants.filter(v => v.get('ac_denovo') > 0)
  }
  return filteredVariants
})

export const visibleVariantsList = createSelector(
  [filteredVariantsById], filteredVariantsById => filteredVariantsById.toList()
)

/**
 * Redux search selectors
 */

const resourceSelector = (resourceName, state) => state.variants.searchIndexed

const searchSelectors = getSearchSelectors({
  resourceName: 'variants',
  resourceSelector,
})
export const variantSearchText = searchSelectors.text
export const variantSearchResult = createSelector(
  [searchSelectors.result, variantSearchText, variantCount],
  (result, variantSearchText, variantCount) => {
    if (result.length !== variantCount && variantSearchText === '') {
      return []
    }
    return result
  }
)
export const isSearching = state => state.search.variants.isSearching

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
  (variants, filteredIdList) => {
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
