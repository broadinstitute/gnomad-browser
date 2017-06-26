/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import { fetchGenePage } from './fetch'
import {
  currentGene
} from './active'

const API_URL = 'http://localhost:8006'

const State = Immutable.Record({
  isFetching: false,
  byGeneName: Immutable.OrderedMap(),
  allGeneNames: Immutable.Set(),
})

const ResourcesState = Immutable.Record({
  variants: Immutable.OrderedMap(),
})

function prepareVariantData(geneData) {
  const VariantRecord = Immutable.Record({
    id: null,
    variant_id: null,
    pos: null,
    hgvsp: null,
    hgvsc: null,
    filters: null,
    rsid: null,
    consequence: null,
    allele_count: null,
    allele_num: null,
    allele_freq: null,
    hom_count: null,
  })

  const variantData = {}
  geneData.variants.forEach((variant) => {
    const id = variant.variant_id //v4()
    variantData[id] = new VariantRecord({ id, ...variant })
  })
  return Immutable.OrderedMap(variantData)
}

export const types = keymirror({
  REQUEST_GENE_DATA: null,
  RECEIVE_GENE_DATA: null,
})

export const actions = {
  requestGeneData: geneName => ({
    type: types.REQUEST_GENE_DATA,
    geneName,
  }),

  receiveGeneData: (geneName, geneData) => ({
    type: types.RECEIVE_GENE_DATA,
    geneName,
    geneData,
  }),

  fetchPageDataByGeneName (geneName) {
    return (dispatch) => {
      dispatch(actions.requestGeneData(geneName))
      fetchGenePage(geneName, API_URL)
        .then((geneData) => {
          dispatch(actions.receiveGeneData(geneName, geneData))
        }
      )
    }
  },

  shouldFetchGene (state, currentGene) {
    const gene = state.genes.allGeneNames[currentGene]
    if (!gene) {
      return true
    }
    if (state.genes.isFetching) {
      return false
    }
    return false
  },

  fetchGeneIfNeeded (currentGene) {
    return (dispatch, getState) => {  // eslint-disable-line
      if (actions.shouldFetchGene(getState(), currentGene)) {
        return dispatch(actions.fetchPageDataByGeneName(currentGene))
      }
    }
  }
}

const actionHandlers = {
  [types.REQUEST_GENE_DATA] (state) {
    return state.set('isFetching', true)
  },
  [types.RECEIVE_GENE_DATA] (state, { geneName, geneData }) {

    return (
      state
        .set('isFetching', false)
        .set('byGeneName', state.byGeneName.set(geneName, Immutable.fromJS(geneData)))
        .set('allGeneNames', state.allGeneNames.add(geneName))
        // .set('variants', prepareVariantData(geneData))
    )
  },
}

const resourcesHandlers = {
  [types.RECEIVE_GENE_DATA] (state, { geneName, geneData }) {
    return (
      state.set('variants', prepareVariantData(geneData))
    )
  },
}

export default function reducer (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

export function resourcesReducer(state = new ResourcesState(), action) {
  const { type } = action
  if (type in resourcesHandlers) {
    return resourcesHandlers[type](state, action)
  }
  return state
}

export const byGeneName = state => state.genes.byGeneName
export const allGeneNames = state => state.genes.allGeneNames
export const isFetching = state => state.genes.isFetching

export const geneData = createSelector(
  [byGeneName, currentGene],
  (byGeneName, currentGene) => byGeneName.get(currentGene),
)

export const variantsById = state => state.resources.get('variants')

export const shouldFetchGene = createSelector(
  [allGeneNames, isFetching, currentGene],
  (allGeneNames, isFetching, currentGene) => {
    if (!allGeneNames[currentGene]) {
      return true
    }
    if (isFetching) {
      return false
    }
    return false
  }
)
