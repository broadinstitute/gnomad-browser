import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import GENE_DISEASES from '@resources/171030-gene-disease-data.json'

import { currentGene } from '@broad/gene-page/src/resources/active'

export const types = keymirror({
  SET_CURRENT_DISEASE: null,
})

export const actions = {
  setCurrentGene: disease => ({ type: types.SET_CURRENT_DISEASE, disease })
}

const actionHandlers = {
  [types.SET_CURRENT_DISEASE] (state, { disease }) {
    return state.set('currentDisease', disease)
  }
}

const State = Immutable.Record({
  geneDiseases: Immutable.Map(GENE_DISEASES.data.genediseases.map(gd =>
    [`${gd.Gene}-${gd.Disease}`, gd])),
  currentDisease: 'HCM',
})

export function variantfx (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

export const currentDisease = state => state.variantfx.currentDisease
export const geneDiseases = state => state.variantfx.geneDiseases

export const allGeneNames = createSelector(
  geneDiseases,
  geneDiseases => Immutable.Set(geneDiseases.map(gd => gd.Name))
)

export const currentGeneDiseaseData = createSelector(
  [currentGene, currentDisease, geneDiseases],
  (currentGene, currentDisease, geneDiseases) => {
    const geneDiseaseKey = `${currentGene}-${currentDisease}`
    if (geneDiseases.has(geneDiseaseKey)) {
      return geneDiseases.get(geneDiseaseKey)
    }
    return 'Gene/disease combo not found'
  }
)
