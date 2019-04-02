/* eslint-disable space-before-function-paren */
/* eslint-disable no-shadow */
/* eslint-disable comma-dangle */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/extensions */
/* eslint-disable no-case-declarations */

import keymirror from 'keymirror'
import R from 'ramda'
import Immutable from 'immutable'
import pv from 'bio-pv'
import superagent from 'superagent'
import { createSelector } from 'reselect'

const { fetchPdb } = pv.io
// const fetchPdb = (url, cb) => {
//   cb()
// }

const State = Immutable.Record({
  rotate: true,
  zoom: 30,
  currentPdb: null,
  structuresByGene: Immutable.Map(),
  retrieving: false,
  currentGene: 'HBB', // HACK for example
})

export const types = keymirror({
  TOGGLE_ROTATE: null,
  SET_ZOOM: null,
  SET_CURRENT_PDB: null,
  RECEIVE_PDB_SEARCH_RESULTS: null,
  NO_PDB_FOUND: null,
  RECEIVE_PDB: null,
  START_PDB_SEARCH: null,
})

export const actions = {
  toggleRotate () {
    return {
      type: types.TOGGLE_ROTATE,
    }
  },

  setZoom (zoomLevel) {
    return {
      type: types.SET_ZOOM,
      zoomLevel,
    }
  },

  setCurrentPdb (currentPdb) {
    return {
      type: types.SET_CURRENT_PDB,
      currentPdb,
    }
  },
  startPdbSearch (currentGene) {
    return {
      type: types.START_PDB_SEARCH,
      currentGene,
    }
  },

  receivePdbSearchResults (currentGene, pdbSearchResultsList) {
    return {
      type: types.RECEIVE_PDB_SEARCH_RESULTS,
      currentGene,
      pdbSearchResultsList,
    }
  },

  receivePdb (currentGene, pdbFile, pdbCode) {
    return {
      type: types.RECEIVE_PDB,
      currentGene,
      pdbCode,
      pdbFile,
    }
  },

  noPdbFound (currentGene) {
    return {
      type: types.NO_PDB_FOUND,
      currentGene,
    }
  },

  ioFetchPdb (currentGene, pdbCode) {
    return (dispatch) => {
      dispatch(actions.startPdbSearch(currentGene))
      fetchPdb(`http://files.rcsb.org/download/${pdbCode}.pdb`,
        pdbFile => dispatch(actions.receivePdb(currentGene, pdbFile, pdbCode)))
    }
  },

  searchPdb (currentGene) {
    return (dispatch) => {
      const query = `
      <orgPdbCompositeQuery version="1.0">
       <queryRefinement>
        <queryRefinementLevel>0</queryRefinementLevel>
        <orgPdbQuery>
          <queryType>org.pdb.query.simple.AdvancedKeywordQuery</queryType>
          <keywords>${currentGene}</keywords>
        </orgPdbQuery>
       </queryRefinement>
       <queryRefinement>
        <queryRefinementLevel>1</queryRefinementLevel>
        <conjunctionType>and</conjunctionType>
        <orgPdbQuery>
        <queryType>org.pdb.query.simple.OrganismQuery</queryType>
          <description>Organism Search: Organism Name=human</description>
          <organismName>homo sapiens</organismName>
        </orgPdbQuery>
       </queryRefinement>
      </orgPdbCompositeQuery>`
      dispatch(actions.startPdbSearch(currentGene))
      return superagent.post('http://www.rcsb.org/pdb/rest/search') // ?sortfield=Residue Count
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(query)
        .then((response) => {
          const results = R.reject(
            R.isEmpty,
            response.text.split('\n')
          )
          dispatch(actions.receivePdbSearchResults(currentGene, results))
          if (results.length > 0) {
            dispatch(actions.ioFetchPdb(currentGene, results[0]))
          } else {
            dispatch(actions.noPdbFound(currentGene))
          }
        })
    }
  },

  shouldFetchPdb (state, currentGene, currentPdb) {
    const structuresForGene = state.structureViewer.structuresByGene.get(currentGene)
    const pdbFiles = structuresForGene.get('pdbFiles')
    console.log('here are the files', pdbFiles)
    if (!pdbFiles.get(currentPdb)) {
      return true
    }
    console.log('Dont have to fetch')
    return false
  },

  fetchPdbIfNeeded (currentGene, pdb) {
    return (dispatch, getState) => {
      if (actions.shouldFetchPdb(getState(), currentGene, pdb)) {
        return dispatch(actions.ioFetchPdb(currentGene, pdb))
      }
      return  // eslint-disable-line
    }
  }
}
const actionHandlers = {
  [types.TOGGLE_ROTATE] (state) {
    return state.set('rotate', !state.get('rotate'))
  },
  [types.SET_ZOOM] (state, { zoomLevel }) {
    return state.set('zoom', zoomLevel)
  },
  [types.SET_CURRENT_PDB] (state, { currentPdb }) {
    return state.set('currentPdb', currentPdb)
  },
  [types.START_PDB_SEARCH] (state) {
    return state.set('retrieving', true)
  },

  [types.RECEIVE_PDB_SEARCH_RESULTS] (state, { currentGene, pdbSearchResultsList }) {
    const searchResults = Immutable.Map({
      hasPdb: true,
      pdbSearchResultsList: Immutable.List(pdbSearchResultsList),
      pdbFiles: Immutable.Map()
    })
    return state
      .set('structuresByGene', state.structuresByGene.set(currentGene, searchResults))
      .set('currentPdb', pdbSearchResultsList[0])
  },

  [types.RECEIVE_PDB] (state, { currentGene, pdbCode, pdbFile }) {
    const previousGeneState = state.structuresByGene.get(currentGene)
    const file = pdbFile || 'FILE HERE'
    const withPdb = previousGeneState
      .set('receivedPdb', true)
      .set('pdbFiles', previousGeneState.get('pdbFiles').set(pdbCode, file))
    return state
      .set('structuresByGene', state.structuresByGene.set(currentGene, withPdb))
      .set('retrieving', false)
  },

  [types.NO_PDB_FOUND] (state, { currentGene }) {
    return state
      .set(
        'structuresByGene',
        state.structuresByGene.set(currentGene, Immutable.Map({ hasPdb: false }))
      )
      .set('retrieving', false)
  }
}

export default function reducer (state = new State(), action) {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

// Selectors
export const currentGene = (state) => {
  if (state.active) {
    return state.active.get('currentGene')
  }
  return state.structureViewer.get('currentGene')
}

export const rotate = state => state.structureViewer.get('rotate')
export const zoom = state => state.structureViewer.get('zoom')
export const retrieving = state => state.structureViewer.get('retrieving')
export const currentPdb = state => state.structureViewer.get('currentPdb')
export const structuresByGene = state => state.structureViewer.get('structuresByGene')

export const structures = createSelector(
  [currentGene, structuresByGene],
  (currentGene, structuresByGene) => {
    if (structuresByGene.get(currentGene)) {
      return structuresByGene.get(currentGene)
    }
    return Immutable.Map({
      pdbSearchResultsList: Immutable.List(),
      pdbFiles: Immutable.Map(),
      hasPdb: false,
      receivedPdb: false,
    })
  }
)

// export const pdbSearchResultsList = (state, currentGene) => {
//   return structures(state, currentGene).get('pdbSearchResultsList')
// }
// export const hasPdb = (state, currentGene) => {
//   return structures(state, currentGene).get('hasPdb')
// }
// export const currentPdbFile = (state, currentGene) => {
//   return structures(state, currentGene).get('hasPdb')
// }

// export const pdbSearchResultsList = state => state.get('pdbSearchResultsList')
// export const receivedPdb = state => state.get('receivedPdb')
// export const structuresByGene = state => state.get('structuresByGene')
//

