/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'
import { getXpos } from '@broad/utilities'

import {
  currentGene
} from './active'

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

  fetchPageDataByGeneName (geneName, geneFetchFunction) {
    return (dispatch) => {
      dispatch(actions.requestGeneData(geneName))
      geneFetchFunction(geneName)
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

  fetchGeneIfNeeded (currentGene, geneFetchFunction) {
    return (dispatch, getState) => {  // eslint-disable-line
      if (actions.shouldFetchGene(getState(), currentGene)) {
        return dispatch(actions.fetchPageDataByGeneName(currentGene, geneFetchFunction))
      }
    }
  }
}

export function makeGeneReducers(variantSchema) {
  const State = Immutable.Record({
    isFetching: false,
    byGeneName: Immutable.OrderedMap(),
    allGeneNames: Immutable.Set(),
  })

  const ResourcesState = Immutable.Record({
    variants: Immutable.OrderedMap(),
  })

  function prepareVariantData(geneData) {
    const VariantRecord = Immutable.Record(variantSchema)

    const variantData = {}
    geneData.variants.forEach((variant) => {
      let id //v4()
      if (variant.variant_id) {
        id = variant.variant_id
      } else {
        id = `${variant.chr}-${variant.pos}-${variant.ref}-${variant.alt}`
      }

      const xpos = variant.xpos ? variant.xpos : getXpos(variant.chr, variant.pos)
      variantData[id] = new VariantRecord({ id, ...variant, variant_id: id, xpos, })
    })
    return Immutable.OrderedMap(variantData)
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

  function genes (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }

  function resources(state = new ResourcesState(), action) {
    const { type } = action
    if (type in resourcesHandlers) {
      return resourcesHandlers[type](state, action)
    }
    return state
  }

  return ({ genes, resources })
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
