import test from 'tape'
import Immutable from 'immutable'

import createTestStore from '../example/store'
import {
  State,
  resources,
  resourceSelector,
  variants,
  searchSelectors,
  dataSearchText,
  filteredIdList,
  searchVariants,
  unfilteredResult,
  immutableData,
} from '../example/resources'
// console.log(immutableData)
const store = createTestStore()

test('Check expected state', (assert) => {
  const state = store.getState()
  assert.deepEqual(Object.keys(state), ['resources', 'search'], 'Root reducer keys')
  assert.deepEqual(Object.keys(state.search.variants), ['isSearching', 'result', 'text'], 'Redux search keys')
  assert.true(Immutable.Map.isMap(state.resources.get('variants')), 'get variant list')
  assert.true(Immutable.Map.isMap(resourceSelector('variants', state)), 'get variant list with selector')
  assert.equal(variants(state).size, 787, 'get variant list with selector')
  assert.end()
})
//
test('Search selectors', (assert) => {
  const state = store.getState()
  // console.log(variants(state).first().toJS())
  // console.log(state)
  assert.equal(dataSearchText(state), '')
  assert.true(Immutable.List.isList(filteredIdList(state)), 'Search selector returns immutable list')
  assert.equal(filteredIdList(state).size, 787, 'Search results list initially 787')
  console.log('filtered', filteredIdList(state))
  console.log('unfiltered', unfilteredResult(state))
  store.dispatch(searchVariants('a'))
  // console.log('filtered', filteredIdList(store.getState()))
  // console.log('unfiltered', unfilteredResult(store.getState()))
  // store.dispatch(searchVariants(''))
  // const stateAfterSearching = store.getState()
  // assert.equal(filteredIdList(stateAfterSearching).size, 1, 'Search results after searching for a variant')
  assert.end()
})

