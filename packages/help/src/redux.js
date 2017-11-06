import { Record, OrderedMap, fromJS } from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import { searchHelpTopics } from './example/fetch'

export const types = keymirror({
  REQUEST_HELP_DATA: null,
  RECEIVE_HELP_DATA: null,
  SET_HELP_QUERY: null,
})

export const actions = {
  setHelpQuery: helpQuery => ({ type: types.SET_HELP_QUERY, helpQuery }),
  receiveHelpData: payload => ({ type: types.RECEIVE_HELP_DATA, payload }),
  requestHelpData: () => ({ type: types.RECEIVE_HELP_DATA }),

  fetchHelpTopicsIfNeeded (query) {
    return (dispatch) => {
      dispatch(actions.requestHelpData)
      return searchHelpTopics(query).then((response) => {
        dispatch(actions.receiveHelpData(response))
      })
    }
  },
}

const HelpEntry = Record({
  score: null,
  topic: null,
  description: null,
})

const actionHandlers = {
  [types.SET_HELP_QUERY] (state, { helpQuery }) {
    return state.set('helpQuery', helpQuery)
  },
  [types.REQUEST_HELP_DATA] (state) {
    return state.set('isFetching', true)
  },
  [types.RECEIVE_HELP_DATA] (state, { payload }) {
    const results = OrderedMap(payload.get('hits').map(hit =>
      [
        hit.getIn(['_source', 'topic']),
        new HelpEntry({
          topic: hit.getIn(['_source', 'topic']),
          description: hit.getIn(['_source', 'description']),
          score: hit.get('_score'),
        })
      ]
    ))
    return state.set('results', results)
  }
}

const State = Record({
  helpQuery: '',
  results: OrderedMap(),
  isFetching: false,
})

export function help (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

export const helpQuery = state => state.help.helpQuery
export const results = state => state.help.results

export const topResultsList = createSelector(
  [results], results => results.toList()
)
