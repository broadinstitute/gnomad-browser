import SearchApi, { INDEX_MODES } from 'js-worker-search'
import keymirror from 'keymirror'
import debounce from 'lodash.debounce'

const types = keymirror({
  SET_ACTIVE_HELP_TOPIC: null,
  SET_HELP_SEARCH_RESULTS: null,
  SET_HELP_SEARCH_TEXT: null,
  TOGGLE_HELP_WINDOW: null,
})

const runSearch = debounce((dispatch, getState) => {
  const { searchApi, searchText, topics } = getState().help

  searchApi.search(searchText).then(topicIds => {
    const searchResults = topicIds.map(id => topics[id])
    dispatch({ type: types.SET_HELP_SEARCH_RESULTS, searchResults })
  })
}, 300)

export const actions = {
  searchHelpTopics: searchText => (dispatch, getState) => {
    dispatch({ type: types.SET_HELP_SEARCH_TEXT, searchText })
    runSearch(dispatch, getState)
  },
  setActiveHelpTopic: topicId => ({ type: types.SET_ACTIVE_HELP_TOPIC, topicId }),
  toggleHelpWindow: () => ({ type: types.TOGGLE_HELP_WINDOW }),
}

const actionHandlers = {
  [types.SET_ACTIVE_HELP_TOPIC](state, { topicId }) {
    return { ...state, activeTopicId: topicId }
  },
  [types.SET_HELP_SEARCH_RESULTS](state, { searchResults }) {
    return { ...state, searchResults }
  },
  [types.SET_HELP_SEARCH_TEXT](state, { searchText }) {
    return { ...state, searchText }
  },
  [types.TOGGLE_HELP_WINDOW](state) {
    return { ...state, isHelpWindowOpen: !state.isHelpWindowOpen }
  },
}

export function createHelpReducer({ topics, toc }) {
  const topicsMap = topics.reduce(
    (acc, topic) => ({ ...acc, [topic.id]: topic }),
    Object.create(null)
  )

  const searchApi = new SearchApi({
    indexMode: INDEX_MODES.PREFIXES,
  })

  topics.forEach(topic => {
    searchApi.indexDocument(topic.id, topic.title)
    searchApi.indexDocument(topic.id, topic.content)
  })

  const initialState = {
    activeTopicId: null,
    isHelpWindowOpen: false,
    searchApi,
    searchResults: [],
    searchText: '',
    toc,
    topics: topicsMap,
  }

  return function help(state = initialState, action) {
    const { type } = action
    if (type in actionHandlers) {
      return actionHandlers[type](state, action)
    }
    return state
  }
}

export const activeHelpTopic = state => {
  const { activeTopicId, topics } = state.help
  return activeTopicId ? topics[activeTopicId] : null
}
export const allHelpTopics = state => state.help.topics
export const helpSearchResults = state => state.help.searchResults
export const helpSearchText = state => state.help.searchText
export const helpTableOfContents = state => state.help.toc
export const isHelpWindowOpen = state => state.help.isHelpWindowOpen
