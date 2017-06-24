import Immutable from 'immutable'
import v4 from 'uuid/v4'
import { createSelector } from 'reselect'
import { createSearchAction, getSearchSelectors } from 'redux-search'

import data from '/Users/msolomon/lens/resources/search-test-PCSK9.json'

const VariantRecord = Immutable.Record({
  id: null,
  variant_id: null,
  hgvsp: null,
  hgvsc: null,
})

const variantData = {}
data.gene.variants.forEach(variant => {
  const id = v4()
  const { variant_id, hgvsc, hgvsp } = variant
  variantData[id] = new VariantRecord({ id, variant_id, hgvsp, hgvsc })
})
export const immutableData = Immutable.OrderedMap(variantData)

export const State = Immutable.Record({
  variants: immutableData,
})

export const resources = state => state.resources

export const resourceSelector = (resourceName, state) => state.resources.get(resourceName)

export const variants = createSelector([resources], resources => resources.variants)

export const searchSelectors = getSearchSelectors({
  resourceName: 'variants',
  resourceSelector,
 })

export const dataSearchText = searchSelectors.text

export const unfilteredResult = searchSelectors.unfilteredResult

export const filteredIdList = createSelector([searchSelectors.result], result => Immutable.List(result))

export const searchVariants = createSearchAction('variants')

export const actions = {
  searchVariants,
}

export function reducer(state = new State(), action) {
  return state
}
