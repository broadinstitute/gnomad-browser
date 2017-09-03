import keymirror from 'keymirror'
import { Record, Set, OrderedMap, Map, fromJS } from 'immutable'

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
        return dispatch(actions.fetchVariantsByStartStop(variantFetchFunction, xstart, xstop))
      }
    }
  }
}

const exampleVariantSchema = {
  gnomadExomes: {
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
  },
  gnomadGenomes: {
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
  },
}

export function createVariantReducer(variantSchema = exampleVariantSchema) {
  const datasets = Object.keys(variantSchema)

  const State = Record({
    isFetching: false,
    byVariantDataset: datasets.reduce((acc, dataset) => (acc.set(dataset, Map())), OrderedMap()),
  })

  const actionHandlers = {
    [types.REQUEST_VARIANTS_BY_POSITION] (state) {
      return state.set('isFetching', true)
    },

    [types.RECEIVE_VARIANTS] (state, payload) {
      return datasets.reduce((nextState, dataset) => {
        return nextState.byVariantDataset.set(
          dataset,
          nextState.byVariantDataset.merge(payload[dataset])
        )
      }, state).set('isFetching', false)
    }
  }

  return function variants (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
}
