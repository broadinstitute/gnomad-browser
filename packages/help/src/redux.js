import { Record, OrderedMap, fromJS } from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import { searchHelpTopics, fetchDefaultTopics } from './example/fetch'

const HelpEntry = Record({
  score: null,
  topic: null,
  htmlString: null,
})

export const types = keymirror({
  REQUEST_HELP_DATA: null,
  RECEIVE_HELP_DATA: null,
  SET_HELP_QUERY: null,
  SET_ACTIVE_TOPIC: null,
  TOGGLE_HELP_WINDOW: null,
})

export const actions = {
  setActiveTopic: topic => ({ type: types.SET_ACTIVE_TOPIC, topic }),
  toggleHelpWindow: () => ({ type: types.TOGGLE_HELP_WINDOW }),
  setHelpQuery: helpQuery => ({ type: types.SET_HELP_QUERY, helpQuery }),
  receiveHelpData: payload => ({ type: types.RECEIVE_HELP_DATA, payload }),
  requestHelpData: () => ({ type: types.RECEIVE_HELP_DATA }),

  fetchDefaultHelpTopics (index) {
    return (dispatch, getState) => {
      dispatch(actions.requestHelpData)
      return fetchDefaultTopics(getState().help.defaultTopics, index).then((response) => {
        dispatch(actions.receiveHelpData(response))
      })
    }
  },

  fetchHelpTopicsIfNeeded (query, index) {
    return (dispatch) => {
      dispatch(actions.requestHelpData)
      return searchHelpTopics(query, index).then((response) => {
        dispatch(actions.receiveHelpData(response))
      })
    }
  },
}

const actionHandlers = {
  [types.TOGGLE_HELP_WINDOW] (state) {
    return state.set('helpWindowOpen', !state.get('helpWindowOpen'))
  },
  [types.SET_ACTIVE_TOPIC] (state, { topic }) {
    return state.set('activeTopic', topic)
  },
  [types.SET_HELP_QUERY] (state, { helpQuery }) {
    return state.set('helpQuery', helpQuery)
  },
  [types.REQUEST_HELP_DATA] (state) {
    return state.set('isFetching', true)
  },
  [types.RECEIVE_HELP_DATA] (state, { payload }) {
    const hits = payload.get('hits')
    const results = OrderedMap(hits.map(hit =>
      [
        hit.getIn(['_source', 'topic']),
        new HelpEntry({
          topic: hit.getIn(['_source', 'topic']),
          htmlString: hit.getIn(['_source', 'htmlString']),
          vcfkey: hit.getIn(['_source', 'vcfkey']),
          score: hit.get('_score'),
        })
      ]
    ))
    return state.set('results', results)
  }
}

const State = Record({
  helpQuery: '',
  activeTopic: null,
  helpWindowOpen: true,
  results: OrderedMap(),
  isFetching: false,
  defaultTopics: [
    'Ancestry',
    'Random forest classifier',
    'Relatedness filtering',
  ]
})

export function help (state = new State(), action: Object): State {
  const { type } = action
  if (type in actionHandlers) {
    return actionHandlers[type](state, action)
  }
  return state
}

export const helpWindowOpen = state => state.help.helpWindowOpen
export const helpQuery = state => state.help.helpQuery
export const results = state => state.help.results
export const activeTopic = state => state.help.activeTopic

export const topResultsList = createSelector(
  [results], results => results.toList()
)

export const activeTopicData = createSelector(
  [activeTopic, results],
  (activeTopic, results) => results.get(activeTopic)
)
