import { applyMiddleware, combineReducers, createStore } from 'redux'
import thunk from 'redux-thunk'

import reducer, {
  actions,
  rotate,
  zoom,
  retrieving,
  currentPdb,
} from './redux'

const store = createStore(combineReducers({ structureViewer: reducer }), applyMiddleware(thunk))

test('Initial state.', () => {
  const initialState = store.getState().structureViewer.toJS()
  expect(initialState).toMatchObject({
    rotate: true,
    zoom: 30,
    currentPdb: null,
    structuresByGene: {},
    retrieving: false,
  })
})

test('toggle rotate.', () => {
  store.dispatch(actions.toggleRotate())
  expect(rotate(store.getState())).toBe(false)
  store.dispatch(actions.toggleRotate())
  expect(rotate(store.getState())).toBe(true)
})

test('Set structure viewer zoom level', () => {
  store.dispatch(actions.setZoom(100))
  expect(zoom(store.getState())).toBe(100)
})

test('Set current pdb', () => {
  store.dispatch(actions.setCurrentPdb('4HHB'))
  expect(currentPdb(store.getState())).toBe('4HHB')
})

test('start pdb search', () => {
  store.dispatch(actions.startPdbSearch('HBB'))
  expect(retrieving(store.getState())).toBe(true)
})

test('test selectors', async () => {
  await store.dispatch(actions.searchPdb('HBB'))
  const stateAfterFetching = store.getState()
  expect(zoom(stateAfterFetching)).toBe(100)
  expect(zoom(stateAfterFetching)).toBe(100)
})
