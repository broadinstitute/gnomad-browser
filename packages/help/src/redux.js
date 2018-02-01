import { Record, OrderedMap, fromJS } from 'immutable'
import keymirror from 'keymirror'
import { createSelector } from 'reselect'

import { fetchHelpTopics } from './fetchHelpTopics'

const HelpEntry = Record({
  score: null,
  title: null,
  id: null,
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
  setActiveTopic: topicId => ({ type: types.SET_ACTIVE_TOPIC, topicId }),
  toggleHelpWindow: () => ({ type: types.TOGGLE_HELP_WINDOW }),
  setHelpQuery: helpQuery => ({ type: types.SET_HELP_QUERY, helpQuery }),
  receiveHelpData: payload => ({ type: types.RECEIVE_HELP_DATA, payload }),
  requestHelpData: () => ({ type: types.REQUEST_HELP_DATA }),

  fetchDefaultHelpTopics (index) {
    return (dispatch, getState) => {
      dispatch(actions.requestHelpData())
      return fetchHelpTopics(index, null, true).then((response) => {
        if (response.errors) {
          console.log(response.errors)
        }
        console.log('got the topics')
        dispatch(actions.receiveHelpData(response))
      }).catch(error => console.log(error))
    }
  },

  fetchHelpTopicsIfNeeded (query, index) {
    return (dispatch) => {
      dispatch(actions.requestHelpData())
      return fetchHelpTopics(index, query).then((response) => {
        dispatch(actions.receiveHelpData(response))
      })
    }
  },
}

const actionHandlers = {
  [types.TOGGLE_HELP_WINDOW] (state) {
    return state.set('helpWindowOpen', !state.get('helpWindowOpen'))
  },
  [types.SET_ACTIVE_TOPIC] (state, { topicId }) {
    return state.set('activeTopic', topicId)
  },
  [types.SET_HELP_QUERY] (state, { helpQuery }) {
    return state.set('helpQuery', helpQuery)
  },
  [types.REQUEST_HELP_DATA] (state) {
    return state.set('isFetching', true)
  },
  [types.RECEIVE_HELP_DATA] (state, { payload }) {
    const topics = payload.topics
    const helpTopics = OrderedMap(topics.map(topic => ([
      topic.id,
      HelpEntry(topic)
    ])))
    return state.set('results', helpTopics)
  }
}

export function createHelpReducer({ toc, index }) {
  const State = Record({
    helpQuery: '',
    activeTopic: null,
    helpWindowOpen: false,
    results: OrderedMap(),
    isFetching: false,
    toc,
    index,
  })

  return function help (state = new State(), action: Object): State {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }

}
export const helpWindowOpen = state => state.help.helpWindowOpen
export const helpQuery = state => state.help.helpQuery
export const results = state => state.help.results
export const activeTopic = state => state.help.activeTopic
export const toc = state => state.help.toc

export const topResultsList = createSelector(
  [results], results => results.toList()
)

export const activeTopicData = createSelector(
  [activeTopic, results],
  (activeTopic, results) => results.get(activeTopic)
)
