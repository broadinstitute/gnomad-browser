import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, fromJS } from 'immutable'
import { createSelector } from 'reselect'

import { types as geneTypes } from './genes'
import { regionViewerIntervals, currentVariant } from './active'

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

const exampleVariantSchema = {
  variants: {
    id: null,
    variant_id: null,
    pos: null,
    xpos: null,
    hgvsp: null,
    hgvsc: null,
    filters: null,
    rsid: null,
    consequence: null,
    allele_count: null,
    allele_num: null,
    allele_freq: null,
    hom_count: null,
    lof: null,
  },
}

export function createVariantReducer(variantSchema = exampleVariantSchema) {
  const datasetKeys = Object.keys(variantSchema)

  const State = Record({
    isFetching: false,
    byVariantDataset: datasetKeys.reduce((acc, dataset) => (acc.set(dataset, Map())), OrderedMap()),
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
        return nextState.set('byVariantDataset', nextState.byVariantDataset
          .set(datasetKey, Map(geneData.get(datasetKey).map(v =>
            ([v.get('variant_id'), v.set('id', v.get('variant_id'))])))))
            // .merge(geneData[dataset].map(v => ([v.variant_id, v])))
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

export const allVariants = createSelector(
  [
    state => state.variants.byVariantDataset.get('variants'),
  ],
  (variants) => variants.toList()
)

export const currentVariantData = createSelector(
  [currentVariant, state => state.variants.byVariantDataset.get('variants')],
  (currentVariant, variants) => variants.get(currentVariant)
)

export const variantsFilteredByActiveInterval = createSelector(
  [
    state => state.variants.byVariantDataset.get('variants'),
    regionViewerIntervals
  ],
  (variants, intervals) => variants.take(10).filter(({ pos }) => {
    console.log(intervals)
    const inIntervals = intervals.some(([start, stop]) => start < pos && pos < stop ).sort((a, b) => a.pos - b.pos)
    console.log(inIntervals)
    return inIntervals
  })
)
