import test from 'tape-promise/tape'

import { createHelpStore } from './store'
import { actions as helpActions } from '../redux'
import { searchHelpTopics } from './fetch'
import {  OrderedMap, Map } from 'immutable'

test('Has initial state.', (assert) => {
  const store = createHelpStore()
  const state = store.getState()

  assert.equal(state.help.helpQuery, '',
    'Initial help query should be empty string')

  assert.equal(state.help.results, OrderedMap(),
    'Initial help results should be ordered map')

  assert.end()
})

test('Query can be set with an action.', (assert) => {
  const store = createHelpStore()
  store.dispatch(helpActions.setHelpQuery('testing'))
  const state = store.getState()
  assert.equal('testing', state.help.helpQuery)
  assert.end()
})

test('Fetch stuff from database.', (assert) => {
  searchHelpTopics('foo').then((response) => {
    assert.true(response.has('max_score'))
    assert.equal(response.get('hits').size, 1)
    assert.equal(response.get('hits').first().getIn(['_source', 'topic']), 'Foo')
    assert.equal(response.get('hits').first().getIn(['_source', 'description']), 'walks into a bar')
    const reshapeResponse = OrderedMap(response.get('hits').map(hit =>
      [hit.getIn(['_source', 'topic']), Map({
        topic: hit.getIn(['_source', 'topic']),
        description: hit.getIn(['_source', 'description']),
        score: hit.get('_score'),
      })]))
  }).catch(error => console.log(error))

  assert.end()
})

test('Update state with fetched data.', (assert) => {
  const store = createHelpStore()
  store.dispatch(helpActions.fetchHelpTopicsIfNeeded('bar')).then(() => {
    const state = store.getState()
    const entry = state.help.results.get('Foo')
    assert.equal(entry.score, 0.2824934)
  })
  assert.end()
})

test('Query triggers fetch.', (assert) => {


  assert.end()
})
