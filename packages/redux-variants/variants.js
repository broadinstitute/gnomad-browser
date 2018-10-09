/* eslint-disable no-shadow */
import keymirror from 'keymirror'
import { Record, OrderedMap, Map, List, fromJS } from 'immutable'
import { createSelector } from 'reselect'

import { types as geneTypes, currentTranscript } from '@broad/redux-genes'
import { types as regionTypes } from '@broad/region'
import { getCategoryFromConsequence, gnomadExportCsvTranslations } from '@broad/utilities'

export const types = keymirror({
  SET_HOVERED_VARIANT: null,
  SET_FOCUSED_VARIANT: null,
  SET_SELECTED_VARIANT_DATASET: null,
  SET_VARIANT_FILTER: null,
  SET_VARIANT_SEARCH_QUERY: null,
  SET_VARIANT_SORT: null,
  TOGGLE_VARIANT_QC_FILTER: null,
  ORDER_VARIANTS_BY_POSITION: null,
  TOGGLE_DENOVO_FILTER: null,
})

export const actions = {
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

  exportVariantsToCsv: (fetchFunction) => {
    const sum = (oldValue, newValue) => oldValue + newValue
    const concat = (oldValue, newValue) => {
      // console.log(oldValue, newValue)
      // console.log(oldValue.concat(newValue))
      return oldValue.concat(newValue)
    }
    const combineKeys = {
      allele_count: sum,
      allele_num: sum,
      hom_count: sum,
      filters: concat,
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

      function combinedAlleleFrequency(variant) {
        return variant.get('allele_count') / variant.get('allele_num')
      }
      function combinedPopmaxFrequency(variant) {
        const frequency = variant.get('popmax_ac') / variant.get('popmax_an')
        return frequency || ''
      }
      function joinFilters(variant) {
        return variant.get('filters').toJS().join('|')
      }

      if (currentDataset === 'gnomadCombinedVariants') {
        return Promise.all([
          fetchFunction(variantIds, transcriptId, 'gnomadExomeVariants'),
          fetchFunction(variantIds, transcriptId, 'gnomadGenomeVariants'),
        ]).then((promiseArray) => {
          const [exomeData, genomeData] = promiseArray
          const exomeDataMapFlattened = flattenForCsv(exomeData)
          const genomeDataMapFlattened = flattenForCsv(genomeData)
          console.log(exomeDataMapFlattened)
          console.log(genomeDataMapFlattened)
          console.log(combineKeys)
          const combined = exomeDataMapFlattened.mergeDeepWith((oldValue, newValue, key) => {
            // console.log(key)
            if (combineKeys[key]) {
              return combineKeys[key](oldValue, newValue)
            }
            return oldValue
          }, genomeDataMapFlattened).map(value => value
            .set('allele_freq', combinedAlleleFrequency(value))
            .set('popmax_af', combinedPopmaxFrequency(value))
            .set('filters', joinFilters(value)))
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
    startingQcFilter,
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
      (acc.set(dataset, OrderedMap())), OrderedMap()),
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
    selectedVariantDataset: startingVariantDataset,
    variantQcFilter: startingQcFilter,
    variantDeNovoFilter: false,
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

    [geneTypes.RECEIVE_GENE_DATA] (state, { geneData }) {
      return datasetKeys.reduce((nextState, datasetKey) => {
        let variantMap = {}
        if (geneData.get(datasetKey)) {
          geneData.get(datasetKey).forEach((variant) => {
            variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
              variant.set('id', variant.get('variant_id'))
            )
          })
        }
        return nextState
          .set('byVariantDataset', nextState.byVariantDataset
            .set(datasetKey, OrderedMap(variantMap))
          )
      }, state)
    },

    [regionTypes.RECEIVE_REGION_DATA] (state, { regionData }) {
      return datasetKeys.reduce((nextState, datasetKey) => {
        let variantMap = {}
        if (regionData.get(datasetKey)) {
          regionData.get(datasetKey).forEach((variant) => {
            variantMap[variant.get('variant_id')] = new variantRecords[datasetKey](
              variant.set('id', variant.get('variant_id'))
            )
          })
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
    getSortVal = variant => {
      const flags = []

      if (variant.get('flags', []).includes('lcr') || variant.get('lcr')) {
        flags.push('lcr')
      }
      if (variant.get('flags', []).includes('segdup') || variant.get('segdup')) {
        flags.push('segdup')
      }
      // FIXME: Remove this second condition (#248)
      // Kept to preserve functionality for gnomAD 2.0.2 variants, which don't have the
      // correct flag value computed
      if (variant.get('flags', []).includes('lc_lof') || variant.get('lof') === 'LC') {
        flags.push('lc_lof')
      }
      if (variant.get('flags', []).includes('lof_flag')) {
        flags.push('lof_flag')
      }

      return flags.length
    }
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
const variantSortAscending = state => state.variants.variantSortAscending
export const variantFilter = state => state.variants.variantFilter
export const variantQcFilter = state => state.variants.variantQcFilter
export const variantDeNovoFilter = state => state.variants.variantDeNovoFilter
const variantMatchesConsequenceCategoryFilter = state =>
  state.variants.variantMatchesConsequenceCategoryFilter
const searchPredicate = state => state.variants.searchPredicate
export const variantSearchQuery = state => state.variants.get('searchQuery')

const filteredVariantsById = createSelector(
  [
    allVariantsInCurrentDataset,
    variantFilter,
    variantQcFilter,
    variantDeNovoFilter,
    variantMatchesConsequenceCategoryFilter,
    searchPredicate,
    variantSearchQuery,
  ],
  (
    variants,
    variantFilter,
    variantQcFilter,
    variantDeNovoFilter,
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

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filteredVariants = filteredVariants.filter(v => searchPredicate(v, query))
    }

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
