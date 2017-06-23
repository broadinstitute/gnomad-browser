import Immutable from 'immutable'
import { createSelector } from 'reselect'
import { createSearchAction, getSearchSelectors } from 'redux-search'

import data from '/Users/msolomon/lens/resources/search-test-PCSK9.json'

export const State = Immutable.Record({
  variants: Immutable.fromJS(data.gene.variants),
})

export const resources = state => state.resources

export const resourceSelector = (resourceName, state) => state.resources.get(resourceName)

export const variants = createSelector([resources], resources => resources.variants)

export function reducer(state = new State(), action) {
  return state
}
