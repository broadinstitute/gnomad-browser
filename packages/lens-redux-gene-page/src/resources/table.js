/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import keymirror from 'keymirror'
import { createSelector } from 'reselect'
import Immutable from 'immutable'

import { getTableIndexByPosition } from 'lens-utilities/lib/variant'

import { currentGene, currentNavigatorPosition } from './active'
import { geneData } from './genes'

const State = Immutable.Record({
  variantSortKey: 'pos',
  variantSortAscending: true,
  variantFilter: 'all',
  visibleInTable: [0, 15],
})

export const types = keymirror({
  SET_VARIANT_SORT: null,
  SET_VARIANT_FILTER: null,
  ORDER_VARIANTS_BY_POSITION: null,
  SET_VISIBLE_IN_TABLE: null,
})

export const actions = {
  setVariantSort: (key) => {
    return {
      type: types.SET_VARIANT_SORT,
      key,
    }
  },

  setVisibleInTable: (range) => {
    return {
      type: types.SET_VISIBLE_IN_TABLE,
      range,
    }
  },

  setVariantFilter: (filter) => {
    return {
      type: types.SET_VISIBLE_IN_TABLE,
      filter,
    }
  }
}

const actionHandlers = {
  [types.SET_VARIANT_SORT] (state, { key }) {
    if (key === state.get('variantSortKey')) {
      return state.set('variantSortKey', !state.get('variantSortAscending'))
    }
    return state.set('variantSortKey', key)
  },
  [types.ORDER_VARIANTS_BY_POSITION] (state) {
    return state
      .set('variantSortKey', 'pos')
      .set('variantSortAscending', true)
  },
  [types.SET_VISIBLE_IN_TABLE] (state, { range }) {
    const [min, max] = state.get('visibleInTable')
    if (min < 0 || max < 0) {
      return state.set('visibleInTable', [0, 15])
    }
    return state.set('visibleInTable', range)
  },
  [types.SET_VARIANT_FILTER] (state, { filter }) {
    return state.set('variantFilter', filter)
  },
}

export default function reducer (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

const sortVariants = (variants, key, ascending) => (
  ascending ?
  variants.sort((a, b) => a[key] - b[key]) :
  variants.sort((a, b) => b[key] - a[key])
)

export const variantSortKey = state => state.table.variantSortKey
export const variantSortAscending = state => state.table.variantSortAscending
export const variantFilter = state => state.table.variantFilter

export const visibleVariants = createSelector(
  [geneData,variantSortKey, variantSortAscending, variantFilter],
  (geneData, variantSortKey, variantSortAscending, variantFilter) => {
    console.log('visible variants', geneData)
    if (geneData) {
      // if (variantFilter === 'all') {
      //   return geneData.get('variants').toList().toJS()
      // }
      // const filtered = geneData.get('variants').filter((v) => {
      //   return v.consequence === variantFilter
      // }).toList().toJS()
      return sortVariants(
        geneData.get('variants').toList().toJS(),
        variantSortKey,
        variantSortAscending
      )
    }
    return []
  },
)

export const tablePosition = createSelector(
  [currentNavigatorPosition, visibleVariants],
  (currentNavigatorPosition, visibleVariants) => {
    return getTableIndexByPosition(
      currentNavigatorPosition,
      visibleVariants,
    )
  }
)
