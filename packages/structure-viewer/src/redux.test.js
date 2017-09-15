import test from 'tape-async'
import sleep from 'sleep-promise'
import Immutable from 'immutable'
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import reducer, {
  actions,
  rotate,
  zoom,
  retrieving,
  currentPdb,
  structures,
  structuresByGene,
} from './redux'

const store = createStore(reducer, applyMiddleware(thunk))

test('Initial state.', (assert) => {
  const expectedInitialState = Immutable.Record({
    rotate: true,
    zoom: 30,
    currentPdb: null,
    structuresByGene: Immutable.Map(),
    retrieving: false,
  })

  const initialState = store.getState()
  assert.deepEqual(new expectedInitialState(), initialState)
  assert.end()
})

test('toggle rotate.', (assert) => {
  store.dispatch(actions.toggleRotate())
  assert.false(store.getState().get('rotate'), 'turn off rotate')
  store.dispatch(actions.toggleRotate())
  assert.true(store.getState().get('rotate'), 'turn on rotate')
  assert.end()
})

test('Set structure viewer zoom level', (assert) => {
  store.dispatch(actions.setZoom(100))
  assert.equal(store.getState().get('zoom'), 100, 'zoom correctly set')
  assert.end()
})

test('Set current pdb', (assert) => {
  store.dispatch(actions.setCurrentPdb('4HHB'))
  assert.equal(store.getState().get('currentPdb'), '4HHB', 'set pdb id')
  assert.end()
})

test('start pdb search', (assert) => {
  store.dispatch(actions.startPdbSearch('HBB'))
  assert.true(store.getState().get('retrieving'), 'set retrieving true')
  assert.end()
})

test('test selectors', async (assert) => {
  store.dispatch(actions.searchPdb('HBB'))
  await sleep(2000)
  const stateAfterFetching = store.getState()
  assert.equal(zoom(stateAfterFetching), 100)
  // console.log(structuresByGene(stateAfterFetching))
  console.log(structures(stateAfterFetching, 'HBB'))
  assert.equal(zoom(stateAfterFetching), 100)
  assert.end()
})
