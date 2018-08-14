import { OrderedMap } from 'immutable'

import { actions as helpActions } from '../redux'
import { createHelpStore } from './store'


test('Has initial state.', () => {
  const store = createHelpStore()
  const state = store.getState()

  expect(state.help.helpQuery).toBe('')
  expect(OrderedMap.isOrderedMap(state.help.results)).toBe(true)
})

test('Query can be set with an action.', () => {
  const store = createHelpStore()
  store.dispatch(helpActions.setHelpQuery('testing'))
  const state = store.getState()
  expect(state.help.helpQuery).toBe('testing')
})
