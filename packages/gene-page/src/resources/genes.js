/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */

import Immutable from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import {
  currentGene,
  actions as activeActions,
} from './active'

import {
  variantFilter,
  actions as variantActions
} from './variants'

export const types = keymirror({
  REQUEST_GENE_DATA: null,
  RECEIVE_GENE_DATA: null,
  SET_CURRENT_TISSUE: null,
  SET_CURRENT_TRANSCRIPT: null,
  TOGGLE_TRANSCRIPT_FAN_OUT: null,
  SET_CURRENT_EXON: null,
  SET_CURRENT_CONSTRAINED_REGION: null
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
    return (dispatch, getState) => {
      const state = getState()
      const options = {
        variantFilter: variantFilter(state),
      }
      dispatch(actions.requestGeneData(geneName))
      geneFetchFunction(geneName, options)
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
    if (match) {
      if (match.params.gene) {
        return (dispatch) => {
          dispatch(activeActions.setCurrentGene(match.params.gene))
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
  },
  setCurrentTissue: tissueName => ({ type: types.SET_CURRENT_TISSUE, tissueName }),
  toggleTranscriptFanOut: () => ({ type: types.TOGGLE_TRANSCRIPT_FAN_OUT }),
  setCurrentTranscript: transcriptId => ({ type: types.SET_CURRENT_TRANSCRIPT, transcriptId }),
  setCurrentExon: exonId => ({ type: types.SET_CURRENT_EXON, exonId }),
  setCurrentConstrainedRegion: constrainedRegionName =>
    ({ type: types.SET_CURRENT_CONSTRAINED_REGION, constrainedRegionName }),
}

export default function createGeneReducer({ variantDatasets }) {
  const variantDatasetKeys = Object.keys(variantDatasets)
  const State = Immutable.Record({
    isFetching: false,
    byGeneName: Immutable.OrderedMap(),
    allGeneNames: Immutable.Set(),
    currentTissue: null,
    currentTranscript: null,
    transcriptFanOut: true,
    currentExon: null,
    currentConstrainedRegion: null,
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
    [types.SET_CURRENT_TISSUE] (state, { tissueName }) {
      return state.set('currentTissue', tissueName)
    },
    [types.SET_CURRENT_TRANSCRIPT] (state, { transcriptId }) {
      return state.set('currentTranscript', transcriptId)
    },
    [types.TOGGLE_TRANSCRIPT_FAN_OUT] (state) {
      return state.set('transcriptFanOut', !state.get('transcriptFanOut'))
    },
    [types.SET_CURRENT_EXON] (state, { exonId }) {
      return state.set('currentExon', exonId)
    },
    [types.SET_CURRENT_CONSTRAINED_REGION] (state, { constrainedRegionName }) {
      return state.set('currentConstrainedRegion', constrainedRegionName)
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

export const currentTissue = state => state.genes.currentTissue
export const currentTranscript = state => state.genes.currentTranscript
export const transcriptFanOut = state => state.genes.transcriptFanOut
export const currentExon = state => state.genes.currentcurrentExon

export const transcripts = createSelector(
  [geneData],
  geneData => geneData.get('transcripts').toJS()
)
export const transcriptsGrouped = createSelector(
  [transcripts],
  (transcripts) => {
    return transcripts.reduce((acc, transcript) => {
      return {
        ...acc,
        [transcript.transcript_id]: transcript,
      }
    }, {})
  }
)

export const tissueStats = createSelector(
  [transcripts],
  (transcripts) => {
    const maxValuesForTissue = transcripts[0].gtex_tissue_tpms_by_transcript
    const tissues = Object.keys(maxValuesForTissue)
    transcripts.forEach((transcript) => {
      tissues.forEach((tissue) => {
        const nextValue = transcript.gtex_tissue_tpms_by_transcript[tissue]
        if (nextValue > maxValuesForTissue[tissue]) {
          maxValuesForTissue[tissue] = nextValue
        }
      })
    })
    return Immutable.Map(maxValuesForTissue).sort().reverse()
  }
)

export const regionalConstraint = createSelector(
  [geneData],
  geneData => geneData.get('exacv1_regional_constraint_regions').toJS()
)

