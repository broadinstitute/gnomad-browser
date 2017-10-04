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
  currentGene,
  actions as activeActions,
} from './active'

import {
  actions as variantActions
} from './variants'

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
    geneData: Immutable.fromJS(geneData),
  }),

  fetchPageDataByGeneName (geneName, geneFetchFunction) {
    return (dispatch) => {
      dispatch(actions.requestGeneData(geneName))
      geneFetchFunction(geneName)
        .then((geneData) => {
          dispatch(actions.receiveGeneData(geneName, geneData))
        })
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

  fetchGeneIfNeeded (currentGene, match, geneFetchFunction) {
    console.log('match', match)
    if (match) {
      if (match.params.gene) {
        return (dispatch) => {
          dispatch(activeActions.setCurrentGene(match.params.gene))
          console.log('this is match', match)
          if (match.params.variantId) {
            dispatch(variantActions.setHoveredVariant(match.params.variantId))
          }
        }
      }
    }
    return (dispatch, getState) => {  // eslint-disable-line
      if (actions.shouldFetchGene(getState(), currentGene)) {
        return dispatch(actions.fetchPageDataByGeneName(currentGene, geneFetchFunction))
      }
    }
  }
}

export default function createGeneReducer({ variantDatasets }) {
  const variantDatasetKeys = Object.keys(variantDatasets)
  const State = Immutable.Record({
    isFetching: false,
    byGeneName: Immutable.OrderedMap(),
    allGeneNames: Immutable.Set(),
  })

  const actionHandlers = {
    [types.REQUEST_GENE_DATA] (state) {
      return state.set('isFetching', true)
    },
    [types.RECEIVE_GENE_DATA] (state, { geneName, geneData }) {
      const geneDataOnly = variantDatasetKeys.reduce((acc, variantDataKey) => {
        return acc.delete(variantDataKey)
      }, geneData)

      return (
        state
          .set('isFetching', false)
          .set('byGeneName', state.byGeneName.set(geneName, geneDataOnly))
          .set('allGeneNames', state.allGeneNames.add(geneName))
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
  return genes
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
