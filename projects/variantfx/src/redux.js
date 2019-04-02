import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import { currentGene } from '@broad/redux-genes'

export const types = keymirror({
  SET_CURRENT_DISEASE: null,
})

export const actions = {
  setCurrentDisease: disease => ({ type: types.SET_CURRENT_DISEASE, disease })
}

const actionHandlers = {
  [types.SET_CURRENT_DISEASE] (state, { disease }) {
    return state.set('currentDisease', disease)
  },
  RECEIVE_GENE_DISEASES(state, {genediseases}) {
    return state
      .set('geneDiseases', Immutable.Map(genediseases.map(gd => [`${gd.Gene}-${gd.Disease}`, Immutable.Map(gd)])))
      .set('uniqueGeneDiseaseNames', Immutable.Set(genediseases.map(gd => gd.Gene)))
      .set('uniqueGeneDiseaseDiseases', Immutable.Set(genediseases.map(gd => gd.Disease)))
  }
}

const State = Immutable.Record({
  geneDiseases: Immutable.Map(),
  currentDisease: 'HCM',
  uniqueGeneDiseaseNames: Immutable.Set(),
  uniqueGeneDiseaseDiseases: Immutable.Set(),
})

export function variantfx (state = new State(), action) {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

export const currentDisease = state => state.variantfx.currentDisease
export const geneDiseases = state => state.variantfx.geneDiseases
export const uniqueGeneDiseaseNames = state => state.variantfx.uniqueGeneDiseaseNames
export const uniqueGeneDiseaseDiseases = state => state.variantfx.uniqueGeneDiseaseDiseases

export const currentGeneDiseaseData = createSelector(
  [currentGene, currentDisease, geneDiseases],
  (currentGene, currentDisease, geneDiseases) => {
    const geneDiseaseKey = `${currentGene}-${currentDisease}`
    if (geneDiseases.has(geneDiseaseKey)) {
      return geneDiseases.get(geneDiseaseKey)
    }
    return Immutable.Map({ error: 'Gene/disease combo not found' })
  }
)
